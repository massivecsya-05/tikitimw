-- Adds cancellation tracking and an atomic cancel_event() function.
-- Cancelling: sets event status, deactivates all ticket tiers (blocks further
-- sales/payment confirmation), cancels all unused tickets (blocks scanning),
-- and returns the list of affected paid customers so the caller can notify them.
-- PayChangu has no refund API for mobile money transactions, so refunds are
-- handled manually by the organiser \u2014 this function does not attempt payment reversal.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

CREATE OR REPLACE FUNCTION public.cancel_event(p_event_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event public.events;
  v_affected jsonb;
BEGIN
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'event_not_found');
  END IF;

  IF v_event.vendor_id <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;

  IF v_event.status = 'cancelled' THEN
    RETURN jsonb_build_object('ok', true, 'already_cancelled', true, 'event_id', p_event_id);
  END IF;

  UPDATE public.events
     SET status = 'cancelled',
         cancelled_at = now(),
         cancellation_reason = p_reason
   WHERE id = p_event_id;

  -- Stop any further sales/payment confirmations for this event.
  UPDATE public.ticket_tiers SET is_active = false WHERE event_id = p_event_id;

  -- Invalidate unused tickets so the gate scanner rejects them.
  -- Tickets already marked 'used' are left as-is (historical attendance record).
  UPDATE public.tickets SET status = 'cancelled' WHERE event_id = p_event_id AND status = 'unused';

  -- Collect distinct paid customers to notify (one row per order, not per ticket).
  SELECT COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
           'order_id', o.id,
           'customer_email', o.customer_email,
           'customer_name', o.customer_name
         )), '[]'::jsonb)
    INTO v_affected
    FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
   WHERE oi.event_id = p_event_id AND o.status = 'paid';

  INSERT INTO public.order_audit_log (order_id, action, metadata)
  SELECT (elem->>'order_id')::uuid, 'event_cancelled', jsonb_build_object('event_id', p_event_id, 'reason', p_reason)
  FROM jsonb_array_elements(v_affected) elem;

  RETURN jsonb_build_object('ok', true, 'already_cancelled', false, 'event_id', p_event_id, 'affected_orders', v_affected);
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_event(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_event(uuid, text) TO authenticated, service_role;
