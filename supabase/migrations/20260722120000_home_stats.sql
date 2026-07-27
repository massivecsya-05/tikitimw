-- Public homepage stats: safe aggregate counts only, no row-level data exposed.
-- Bypasses RLS via SECURITY DEFINER since orders/order_items are customer-scoped,
-- but only returns three integers, never any order/customer detail.

CREATE OR REPLACE FUNCTION public.get_home_stats()
RETURNS TABLE (
  tickets_sold bigint,
  events_hosted bigint,
  organisers bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    (
      SELECT COALESCE(SUM(oi.quantity), 0)
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE o.status = 'paid'
    ) AS tickets_sold,
    (
      SELECT COUNT(*)
      FROM public.events e
      WHERE e.status = 'published'
    ) AS events_hosted,
    (
      SELECT COUNT(DISTINCT e.vendor_id)
      FROM public.events e
      WHERE e.status = 'published'
    ) AS organisers;
$$;

-- Anyone (including anonymous visitors) can call this — it only ever returns counts.
GRANT EXECUTE ON FUNCTION public.get_home_stats() TO anon, authenticated;
