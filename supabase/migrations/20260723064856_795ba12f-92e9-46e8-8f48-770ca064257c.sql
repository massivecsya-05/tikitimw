ALTER TABLE public.ticket_tiers
  ADD COLUMN IF NOT EXISTS quantity_sold integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sale_start timestamptz,
  ADD COLUMN IF NOT EXISTS sale_end timestamptz,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

UPDATE public.ticket_tiers
SET quantity_sold = sold
WHERE quantity_sold = 0 AND sold > 0;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_phone text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND constraint_name = 'orders_customer_phone_mw_chk'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_customer_phone_mw_chk
      CHECK (customer_phone IS NULL OR customer_phone ~ '^\+265[0-9]{7,9}$');
  END IF;
END $$;

DO $$ BEGIN
  CREATE TYPE public.ticket_status AS ENUM ('unused', 'used', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES public.ticket_tiers(id) ON DELETE RESTRICT,
  buyer_name text,
  buyer_email text,
  buyer_phone text,
  qr_code text NOT NULL,
  status public.ticket_status NOT NULL DEFAULT 'unused',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO service_role;

CREATE INDEX IF NOT EXISTS idx_tickets_order_id ON public.tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON public.tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_buyer_phone_event ON public.tickets(event_id, buyer_phone);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "buyers view own tickets" ON public.tickets;
CREATE POLICY "buyers view own tickets"
ON public.tickets FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = tickets.order_id
      AND o.customer_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "vendors view own event tickets" ON public.tickets;
CREATE POLICY "vendors view own event tickets"
ON public.tickets FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = tickets.event_id
      AND (e.vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  )
);

DROP POLICY IF EXISTS "admins update tickets" ON public.tickets;
CREATE POLICY "admins update tickets"
ON public.tickets FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.scan_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE SET NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  scanned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  result text NOT NULL,
  raw_code text
);

GRANT SELECT, INSERT ON public.scan_logs TO authenticated;
GRANT ALL ON public.scan_logs TO service_role;

CREATE INDEX IF NOT EXISTS idx_scan_logs_ticket_id ON public.scan_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_event_id ON public.scan_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_scanned_at ON public.scan_logs(scanned_at DESC);

ALTER TABLE public.scan_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins view scan logs" ON public.scan_logs;
CREATE POLICY "admins view scan logs"
ON public.scan_logs FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "vendors view own scan logs" ON public.scan_logs;
CREATE POLICY "vendors view own scan logs"
ON public.scan_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = scan_logs.event_id
      AND e.vendor_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "scanner users insert logs" ON public.scan_logs;
CREATE POLICY "scanner users insert logs"
ON public.scan_logs FOR INSERT
WITH CHECK (
  scanned_by = auth.uid()
  AND (public.has_role(auth.uid(), 'vendor'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
);

CREATE OR REPLACE FUNCTION public.enforce_phone_ticket_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
  v_status public.order_status;
  v_count integer;
BEGIN
  SELECT o.customer_phone, o.status
    INTO v_phone, v_status
    FROM public.orders o
   WHERE o.id = NEW.order_id;

  IF v_phone IS NULL OR v_phone = '' THEN
    RETURN NEW;
  END IF;

  IF v_status NOT IN ('pending', 'paid') THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)::int
    INTO v_count
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
   WHERE oi.event_id = NEW.event_id
     AND o.customer_phone = v_phone
     AND o.status IN ('pending', 'paid');

  IF v_count >= 4 THEN
    RAISE EXCEPTION 'Max 4 tickets per phone number per event';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_phone_ticket_limit ON public.order_items;
CREATE TRIGGER trg_enforce_phone_ticket_limit
BEFORE INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.enforce_phone_ticket_limit();

CREATE OR REPLACE FUNCTION public.scan_ticket(p_ticket_id uuid, p_event_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket record;
BEGIN
  SELECT t.id, t.event_id, t.tier_id, t.buyer_name, t.status, e.vendor_id, e.title AS event_title, tt.name AS tier_name
    INTO v_ticket
    FROM public.tickets t
    JOIN public.events e ON e.id = t.event_id
    JOIN public.ticket_tiers tt ON tt.id = t.tier_id
   WHERE t.id = p_ticket_id
   FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.scan_logs (ticket_id, event_id, scanned_by, result, raw_code)
    VALUES (NULL, p_event_id, auth.uid(), 'invalid_ticket', p_ticket_id::text);
    RETURN jsonb_build_object('ok', false, 'status', 'invalid_ticket');
  END IF;

  IF v_ticket.vendor_id <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    INSERT INTO public.scan_logs (ticket_id, event_id, scanned_by, result, raw_code)
    VALUES (v_ticket.id, v_ticket.event_id, auth.uid(), 'unauthorized_event', p_ticket_id::text);
    RETURN jsonb_build_object('ok', false, 'status', 'unauthorized_event');
  END IF;

  IF p_event_id IS NOT NULL AND v_ticket.event_id <> p_event_id THEN
    INSERT INTO public.scan_logs (ticket_id, event_id, scanned_by, result, raw_code)
    VALUES (v_ticket.id, v_ticket.event_id, auth.uid(), 'wrong_event', p_ticket_id::text);
    RETURN jsonb_build_object('ok', false, 'status', 'wrong_event');
  END IF;

  IF v_ticket.status = 'used' THEN
    INSERT INTO public.scan_logs (ticket_id, event_id, scanned_by, result, raw_code)
    VALUES (v_ticket.id, v_ticket.event_id, auth.uid(), 'already_used', p_ticket_id::text);
    RETURN jsonb_build_object(
      'ok', false, 'status', 'already_used',
      'buyer_name', v_ticket.buyer_name,
      'tier_name', v_ticket.tier_name,
      'event_title', v_ticket.event_title
    );
  END IF;

  IF v_ticket.status = 'cancelled' THEN
    INSERT INTO public.scan_logs (ticket_id, event_id, scanned_by, result, raw_code)
    VALUES (v_ticket.id, v_ticket.event_id, auth.uid(), 'cancelled_ticket', p_ticket_id::text);
    RETURN jsonb_build_object('ok', false, 'status', 'cancelled_ticket');
  END IF;

  UPDATE public.tickets
     SET status = 'used'
   WHERE id = v_ticket.id;

  INSERT INTO public.scan_logs (ticket_id, event_id, scanned_by, result, raw_code)
  VALUES (v_ticket.id, v_ticket.event_id, auth.uid(), 'used_ok', p_ticket_id::text);

  RETURN jsonb_build_object(
    'ok', true, 'status', 'used_ok',
    'buyer_name', v_ticket.buyer_name,
    'tier_name', v_ticket.tier_name,
    'event_title', v_ticket.event_title
  );
END;
$$;

REVOKE ALL ON FUNCTION public.scan_ticket(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.scan_ticket(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.confirm_payment(
  p_order_id uuid,
  p_provider_ref text,
  p_provider text DEFAULT 'paychangu'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders;
  v_item record;
  v_vendor record;
  v_fee_pct numeric := 0;
  v_fee_flat numeric := 0;
  v_fee numeric;
  v_updated integer;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'order_not_found');
  END IF;

  IF v_order.status = 'paid' THEN
    RETURN jsonb_build_object('ok', true, 'already_paid', true, 'order_id', p_order_id);
  END IF;

  FOR v_item IN
    SELECT tier_id, COUNT(*)::int AS qty
    FROM public.order_items
    WHERE order_id = p_order_id
    GROUP BY tier_id
  LOOP
    UPDATE public.ticket_tiers
       SET quantity_sold = quantity_sold + v_item.qty,
           sold = sold + v_item.qty
     WHERE id = v_item.tier_id
       AND quantity - quantity_sold >= v_item.qty
       AND is_active = true
       AND (sale_start IS NULL OR sale_start <= now())
       AND (sale_end IS NULL OR sale_end >= now());

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated = 0 THEN
      UPDATE public.orders SET status = 'failed' WHERE id = p_order_id;
      INSERT INTO public.order_audit_log (order_id, action, metadata)
      VALUES (p_order_id, 'payment_failed_inventory',
              jsonb_build_object('tier_id', v_item.tier_id, 'qty', v_item.qty));
      RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_inventory', 'tier_id', v_item.tier_id);
    END IF;
  END LOOP;

  UPDATE public.orders
     SET status = 'paid',
         payment_ref = p_provider_ref,
         payment_provider = p_provider,
         paid_at = now()
   WHERE id = p_order_id;

  SELECT fee_percent, fee_flat_mwk INTO v_fee_pct, v_fee_flat
  FROM public.platform_settings WHERE id = true;
  v_fee_pct := COALESCE(v_fee_pct, 0);
  v_fee_flat := COALESCE(v_fee_flat, 0);

  FOR v_vendor IN
    SELECT e.vendor_id,
           SUM(oi.unit_price_mwk * oi.quantity)::numeric AS gross,
           SUM(oi.quantity)::int AS tickets
    FROM public.order_items oi
    JOIN public.events e ON e.id = oi.event_id
    WHERE oi.order_id = p_order_id
    GROUP BY e.vendor_id
  LOOP
    v_fee := ROUND(v_vendor.gross * v_fee_pct / 100.0, 2) + (v_fee_flat * v_vendor.tickets);
    INSERT INTO public.vendor_payouts (
      vendor_id, order_id, gross_mwk, fee_mwk, net_mwk, tickets_count,
      fee_percent_snapshot, fee_flat_snapshot
    ) VALUES (
      v_vendor.vendor_id, p_order_id, v_vendor.gross, v_fee,
      v_vendor.gross - v_fee, v_vendor.tickets, v_fee_pct, v_fee_flat
    )
    ON CONFLICT (vendor_id, order_id) DO NOTHING;
  END LOOP;

  INSERT INTO public.order_audit_log (order_id, action, metadata)
  VALUES (p_order_id, 'payment_confirmed',
          jsonb_build_object('provider', p_provider, 'ref', p_provider_ref));

  RETURN jsonb_build_object('ok', true, 'already_paid', false, 'order_id', p_order_id);
END;
$$;
