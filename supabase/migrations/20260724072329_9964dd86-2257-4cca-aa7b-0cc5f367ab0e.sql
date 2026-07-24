
CREATE TABLE public.vendor_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL CHECK (business_type IN ('individual','sole_proprietor','company','ngo','other')),
  registration_number TEXT,
  tax_id TEXT,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  event_types TEXT,
  description TEXT NOT NULL,
  website_or_social TEXT,
  id_document_type TEXT CHECK (id_document_type IN ('national_id','passport','drivers_license','other')),
  id_number TEXT,
  agreed_to_terms BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  note TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX vendor_applications_one_pending_per_user
  ON public.vendor_applications (user_id)
  WHERE status = 'pending';

CREATE INDEX vendor_applications_status_idx ON public.vendor_applications (status, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.vendor_applications TO authenticated;
GRANT ALL ON public.vendor_applications TO service_role;

ALTER TABLE public.vendor_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own applications"
  ON public.vendor_applications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create own applications"
  ON public.vendor_applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND agreed_to_terms = true);

CREATE POLICY "Admins update applications"
  ON public.vendor_applications FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER vendor_applications_touch_updated_at
  BEFORE UPDATE ON public.vendor_applications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
