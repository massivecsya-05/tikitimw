-- Allow event deletion when orders/tickets exist (admin + vendor).
-- Fixes: order_items_event_id_fkey blocks DELETE FROM events.

-- Cascade order_items when event or tier is removed
ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_event_id_fkey;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_tier_id_fkey;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_tier_id_fkey
  FOREIGN KEY (tier_id) REFERENCES public.ticket_tiers(id) ON DELETE CASCADE;

-- RLS: cascaded deletes run as the same role and need explicit DELETE policies
DROP POLICY IF EXISTS "admins delete order items" ON public.order_items;
CREATE POLICY "admins delete order items"
ON public.order_items FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "vendors delete own event order items" ON public.order_items;
CREATE POLICY "vendors delete own event order items"
ON public.order_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = order_items.event_id
      AND e.vendor_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "admins delete tickets" ON public.tickets;
CREATE POLICY "admins delete tickets"
ON public.tickets FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "vendors delete own event tickets" ON public.tickets;
CREATE POLICY "vendors delete own event tickets"
ON public.tickets FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = tickets.event_id
      AND e.vendor_id = auth.uid()
  )
);

-- Central delete: works with RLS and cleans empty pending orders
CREATE OR REPLACE FUNCTION public.delete_event(p_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = p_event_id AND e.vendor_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'not authorized to delete this event';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = p_event_id) THEN
    RAISE EXCEPTION 'event not found';
  END IF;

  DELETE FROM public.tickets WHERE event_id = p_event_id;
  DELETE FROM public.order_items WHERE event_id = p_event_id;

  -- Remove abandoned checkout orders (paid orders keep audit via vendor_payouts)
  DELETE FROM public.orders o
  WHERE o.status = 'pending'
    AND NOT EXISTS (
      SELECT 1 FROM public.order_items oi WHERE oi.order_id = o.id
    );

  DELETE FROM public.events WHERE id = p_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_event(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_event(uuid) TO authenticated, service_role;

-- Cron cleanup: use same delete path
CREATE OR REPLACE FUNCTION public.cleanup_past_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  r record;
BEGIN
  FOR r IN
    SELECT id FROM public.events
    WHERE COALESCE(ends_at, starts_at) < now() - interval '1 day'
  LOOP
    DELETE FROM public.tickets WHERE event_id = r.id;
    DELETE FROM public.order_items WHERE event_id = r.id;
    DELETE FROM public.orders o
    WHERE o.status = 'pending'
      AND NOT EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = o.id);
    DELETE FROM public.events WHERE id = r.id;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;
