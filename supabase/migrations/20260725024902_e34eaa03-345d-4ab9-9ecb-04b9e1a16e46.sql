
ALTER TABLE public.events ALTER COLUMN vendor_id DROP NOT NULL;
ALTER TABLE public.events DROP CONSTRAINT events_vendor_id_fkey;
ALTER TABLE public.events ADD CONSTRAINT events_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.order_items DROP CONSTRAINT order_items_event_id_fkey;
ALTER TABLE public.order_items ALTER COLUMN event_id DROP NOT NULL;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;

ALTER TABLE public.vendor_payouts DROP CONSTRAINT IF EXISTS vendor_payouts_vendor_id_fkey;
ALTER TABLE public.vendor_payouts ALTER COLUMN vendor_id DROP NOT NULL;
ALTER TABLE public.vendor_payouts ADD CONSTRAINT vendor_payouts_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES auth.users(id) ON DELETE SET NULL;
