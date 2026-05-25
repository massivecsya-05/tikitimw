-- Payment + check-in metadata columns
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_ref text,
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_email text;

CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_ref_unique
  ON public.orders(payment_ref) WHERE payment_ref IS NOT NULL;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;

-- Audit log for orders (refunds, payment confirmations, check-ins)
CREATE TABLE IF NOT EXISTS public.order_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  action text NOT NULL,
  actor_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins view all audit logs"
  ON public.order_audit_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "customers view own audit logs"
  ON public.order_audit_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_audit_log.order_id AND o.customer_id = auth.uid()
  ));

CREATE POLICY "vendors view own event audit logs"
  ON public.order_audit_log FOR SELECT
  USING (public.vendor_owns_order(order_id, auth.uid()));

-- Idempotent payment confirmation: marks order paid + decrements tier inventory atomically.
-- SECURITY DEFINER so webhooks (no auth context) can call via service role.
CREATE OR REPLACE FUNCTION public.confirm_payment(
  p_order_id uuid,
  p_provider_ref text,
  p_provider text DEFAULT 'paychangu'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders;
  v_item record;
BEGIN
  -- Lock the order row to serialize concurrent webhooks
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'order_not_found');
  END IF;

  -- Idempotency: if already paid, return success without re-incrementing inventory
  IF v_order.status = 'paid' THEN
    RETURN jsonb_build_object('ok', true, 'already_paid', true, 'order_id', p_order_id);
  END IF;

  -- Decrement tier inventory with row locks (sold counter)
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

  INSERT INTO public.order_audit_log (order_id, action, metadata)
  VALUES (p_order_id, 'payment_confirmed',
          jsonb_build_object('provider', p_provider, 'ref', p_provider_ref));

  RETURN jsonb_build_object('ok', true, 'already_paid', false, 'order_id', p_order_id);
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_payment(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_payment(uuid, text, text) TO service_role;

-- Gate check-in RPC (used by Scanner page later in Phase 2A)
CREATE OR REPLACE FUNCTION public.check_in(p_order_item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item record;
  v_already timestamptz;
BEGIN
  SELECT oi.*, e.title AS event_title, e.vendor_id, t.name AS tier_name,
         p.full_name AS attendee_name
    INTO v_item
    FROM public.order_items oi
    JOIN public.events e ON e.id = oi.event_id
    JOIN public.ticket_tiers t ON t.id = oi.tier_id
    JOIN public.orders o ON o.id = oi.order_id
    LEFT JOIN public.profiles p ON p.id = o.customer_id
   WHERE oi.id = p_order_item_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'status', 'not_found');
  END IF;

  -- Caller must be the event vendor or an admin
  IF v_item.vendor_id <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'status', 'unauthorized');
  END IF;

  IF v_item.checked_in_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', false, 'status', 'already_checked_in',
      'checked_in_at', v_item.checked_in_at,
      'event_title', v_item.event_title,
      'tier_name', v_item.tier_name,
      'attendee_name', v_item.attendee_name
    );
  END IF;

  UPDATE public.order_items
     SET checked_in = true, checked_in_at = now()
   WHERE id = p_order_item_id;

  INSERT INTO public.order_audit_log (order_id, action, actor_id, metadata)
  VALUES (v_item.order_id, 'check_in', auth.uid(),
          jsonb_build_object('order_item_id', p_order_item_id));

  RETURN jsonb_build_object(
    'ok', true, 'status', 'checked_in',
    'event_title', v_item.event_title,
    'tier_name', v_item.tier_name,
    'attendee_name', v_item.attendee_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_in(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_in(uuid) TO authenticated, service_role;