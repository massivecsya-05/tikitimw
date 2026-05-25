
REVOKE EXECUTE ON FUNCTION public.confirm_payment(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_past_events() FROM PUBLIC, anon, authenticated;
