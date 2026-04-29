-- Grant admin role to user
INSERT INTO public.user_roles (user_id, role)
SELECT '44319403-4ec7-4392-ad92-c5e1f0e27ca4', 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = '44319403-4ec7-4392-ad92-c5e1f0e27ca4' AND role = 'admin'
);

-- Fix infinite recursion in orders SELECT policy
-- The previous policy referenced order_items which references orders => recursion.
-- Replace with a security-definer helper that checks vendor access without recursion.
DROP POLICY IF EXISTS "customers view own orders" ON public.orders;

CREATE OR REPLACE FUNCTION public.vendor_owns_order(_order_id uuid, _vendor uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.events e ON e.id = oi.event_id
    WHERE oi.order_id = _order_id AND e.vendor_id = _vendor
  )
$$;

CREATE POLICY "customers view own orders"
ON public.orders
FOR SELECT
USING (
  auth.uid() = customer_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.vendor_owns_order(id, auth.uid())
);
