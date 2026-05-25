-- Vendor application workflow: customers request, admins approve (avoids RLS on user_roles inserts)

CREATE TYPE public.vendor_application_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.vendor_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.vendor_application_status NOT NULL DEFAULT 'pending',
  note TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one pending application per user at a time
CREATE UNIQUE INDEX vendor_applications_one_pending_per_user
  ON public.vendor_applications (user_id)
  WHERE status = 'pending';

ALTER TABLE public.vendor_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own vendor applications"
  ON public.vendor_applications FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "users submit vendor application"
  ON public.vendor_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "admins update vendor applications"
  ON public.vendor_applications FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
