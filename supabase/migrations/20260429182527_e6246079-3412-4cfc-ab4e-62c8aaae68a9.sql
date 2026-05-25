
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'vendor', 'customer');
CREATE TYPE public.event_status AS ENUM ('draft', 'published', 'cancelled', 'completed');
CREATE TYPE public.event_category AS ENUM ('concert', 'sports', 'conference', 'cultural', 'festival', 'theatre', 'other');
CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE public.payment_method AS ENUM ('airtel_money', 'tnm_mpamba', 'card', 'bank_transfer');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Events
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category event_category NOT NULL DEFAULT 'other',
  venue TEXT NOT NULL,
  city TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  banner_url TEXT,
  status event_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Ticket tiers
CREATE TABLE public.ticket_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_mwk NUMERIC(12,2) NOT NULL CHECK (price_mwk >= 0),
  quantity INT NOT NULL CHECK (quantity >= 0),
  sold INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ticket_tiers ENABLE ROW LEVEL SECURITY;

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_mwk NUMERIC(12,2) NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  payment_method payment_method,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Order items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES public.ticket_tiers(id),
  event_id UUID NOT NULL REFERENCES public.events(id),
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price_mwk NUMERIC(12,2) NOT NULL,
  qr_code TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  checked_in BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER events_touch BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-create profile + customer role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies
-- profiles
CREATE POLICY "users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- user_roles
CREATE POLICY "users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- events
CREATE POLICY "anyone views published events" ON public.events FOR SELECT USING (status = 'published' OR vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "vendors create events" ON public.events FOR INSERT WITH CHECK (auth.uid() = vendor_id AND (public.has_role(auth.uid(), 'vendor') OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "vendors update own events" ON public.events FOR UPDATE USING (auth.uid() = vendor_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "vendors delete own events" ON public.events FOR DELETE USING (auth.uid() = vendor_id OR public.has_role(auth.uid(), 'admin'));

-- ticket_tiers
CREATE POLICY "anyone views tiers of published events" ON public.ticket_tiers FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND (e.status = 'published' OR e.vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);
CREATE POLICY "vendors manage own tiers" ON public.ticket_tiers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND (e.vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND (e.vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);

-- orders
CREATE POLICY "customers view own orders" ON public.orders FOR SELECT USING (
  auth.uid() = customer_id OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.order_items oi JOIN public.events e ON e.id = oi.event_id WHERE oi.order_id = orders.id AND e.vendor_id = auth.uid())
);
CREATE POLICY "customers create own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "customers update own orders" ON public.orders FOR UPDATE USING (auth.uid() = customer_id OR public.has_role(auth.uid(), 'admin'));

-- order_items
CREATE POLICY "view related order items" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.customer_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.vendor_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "customers create own order items" ON public.order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.customer_id = auth.uid())
);
