
-- Platform settings (singleton row)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  fee_percent numeric NOT NULL DEFAULT 5,
  fee_flat_mwk numeric NOT NULL DEFAULT 200,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.platform_settings (id) VALUES (true) ON CONFLICT DO NOTHING;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads platform settings" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "admins update platform settings" ON public.platform_settings FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins insert platform settings" ON public.platform_settings FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Payout status enum
DO $$ BEGIN
  CREATE TYPE public.payout_status AS ENUM ('pending', 'paid', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Vendor payouts table
CREATE TABLE IF NOT EXISTS public.vendor_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL,
  order_id uuid NOT NULL,
  gross_mwk numeric NOT NULL,
  fee_mwk numeric NOT NULL,
  net_mwk numeric NOT NULL,
  tickets_count integer NOT NULL,
  fee_percent_snapshot numeric NOT NULL,
  fee_flat_snapshot numeric NOT NULL,
  status public.payout_status NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, order_id)
);
CREATE INDEX IF NOT EXISTS idx_vendor_payouts_vendor ON public.vendor_payouts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payouts_status ON public.vendor_payouts(status);

ALTER TABLE public.vendor_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendors and admins view payouts" ON public.vendor_payouts FOR SELECT
  USING (vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins update payouts" ON public.vendor_payouts FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Extend confirm_payment to compute vendor payouts using current fee settings
CREATE OR REPLACE FUNCTION public.confirm_payment(p_order_id uuid, p_provider_ref text, p_provider text DEFAULT 'paychangu'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order public.orders;
  v_item record;
  v_vendor record;
  v_fee_pct numeric := 0;
  v_fee_flat numeric := 0;
  v_fee numeric;
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
       SET sold = sold + v_item.qty
     WHERE id = v_item.tier_id;
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
$function$;
