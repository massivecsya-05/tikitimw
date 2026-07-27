-- Fix critical gap: confirm_payment never created rows in the `tickets` table,
-- which is what the gate scanner (scan_ticket) actually reads from.
-- This left every real ticket unscannable at the door.

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
  v_oi record;
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

  -- Reserve inventory atomically; fail fast if any tier has insufficient remaining stock.
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

  -- Create one `tickets` row per order_item (per ticket unit purchased).
  -- This is the table the gate scanner actually reads from via scan_ticket().
  FOR v_oi IN
    SELECT oi.id, oi.event_id, oi.tier_id, oi.quantity, o.customer_name, o.customer_email, o.customer_phone
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.order_id = p_order_id
  LOOP
    -- quantity on order_items represents how many tickets that line item covers;
    -- insert one tickets row per unit so each has its own scannable QR.
    INSERT INTO public.tickets (order_id, event_id, tier_id, buyer_name, buyer_email, buyer_phone, qr_code, status)
    SELECT p_order_id, v_oi.event_id, v_oi.tier_id, v_oi.customer_name, v_oi.customer_email, v_oi.customer_phone,
           '', 'unused'
    FROM generate_series(1, v_oi.quantity);
  END LOOP;

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
