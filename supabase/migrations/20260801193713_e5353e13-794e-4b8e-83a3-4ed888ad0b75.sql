CREATE OR REPLACE FUNCTION public.log_order_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_activity_log (actor_id, action, target_type, target_id, target_label, details)
  VALUES (
    NEW.customer_id,
    'order_paid',
    'order',
    NEW.id::text,
    concat('MWK ', NEW.total_mwk),
    jsonb_build_object('total_mwk', NEW.total_mwk, 'payment_method', NEW.payment_method)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_order_paid_update ON public.orders;
CREATE TRIGGER trg_log_order_paid_update
AFTER UPDATE ON public.orders
FOR EACH ROW
WHEN (NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid')
EXECUTE FUNCTION public.log_order_paid();

DROP TRIGGER IF EXISTS trg_log_order_paid_insert ON public.orders;
CREATE TRIGGER trg_log_order_paid_insert
AFTER INSERT ON public.orders
FOR EACH ROW
WHEN (NEW.status = 'paid')
EXECUTE FUNCTION public.log_order_paid();