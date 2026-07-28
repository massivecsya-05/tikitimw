CREATE OR REPLACE FUNCTION public.delete_event(p_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor uuid;
BEGIN
  SELECT vendor_id INTO v_vendor FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;
  IF v_vendor IS NOT NULL AND v_vendor <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized to delete this event';
  END IF;
  DELETE FROM public.ticket_tiers WHERE event_id = p_event_id;
  DELETE FROM public.order_items WHERE event_id = p_event_id;
  DELETE FROM public.events WHERE id = p_event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_event(p_event_id uuid) TO authenticated;