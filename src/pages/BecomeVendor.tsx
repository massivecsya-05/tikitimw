import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Check, Store, Zap, BarChart3, Clock, ShieldCheck } from "lucide-react";
import { z } from "zod";

type AppStatus = "none" | "pending" | "rejected" | "loading";

const applicationSchema = z.object({
  business_name: z.string().trim().min(2, "Business name is required").max(120),
  business_type: z.enum(["individual", "sole_proprietor", "company", "ngo", "other"]),
  registration_number: z.string().trim().max(80).optional().or(z.literal("")),
  tax_id: z.string().trim().max(80).optional().or(z.literal("")),
  contact_name: z.string().trim().min(2, "Contact name is required").max(120),
  contact_phone: z.string().trim().min(7, "Valid phone required").max(20),
  contact_email: z.string().trim().email("Valid email required").max(255),
  city: z.string().trim().min(2, "City is required").max(80),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  event_types: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().min(20, "Please describe your events (min 20 chars)").max(1000),
  website_or_social: z.string().trim().max(200).optional().or(z.literal("")),
  id_document_type: z.enum(["national_id", "passport", "drivers_license", "other"]),
  id_number: z.string().trim().min(3, "ID number is required").max(60),
  agreed_to_terms: z.literal(true, { errorMap: () => ({ message: "You must accept the terms" }) }),
});

type FormState = {
  business_name: string;
  business_type: "individual" | "sole_proprietor" | "company" | "ngo" | "other";
  registration_number: string;
  tax_id: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  city: string;
  address: string;
  event_types: string;
  description: string;
  website_or_social: string;
  id_document_type: "national_id" | "passport" | "drivers_license" | "other";
  id_number: string;
  agreed_to_terms: boolean;
};

const BecomeVendor = () => {
  const { user, roles, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [appStatus, setAppStatus] = useState<AppStatus>("loading");
  const [form, setForm] = useState<FormState>({
    business_name: "",
    business_type: "individual",
    registration_number: "",
    tax_id: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    city: "",
    address: "",
    event_types: "",
    description: "",
    website_or_social: "",
    id_document_type: "national_id",
    id_number: "",
    agreed_to_terms: false,
  });

  useEffect(() => {
    if (!user || roles.includes("vendor")) return;
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .maybeSingle();
      setForm((f) => ({
        ...f,
        contact_name: f.contact_name || profile?.full_name || "",
        contact_phone: f.contact_phone || profile?.phone || "",
        contact_email: f.contact_email || user.email || "",
      }));

      const { data } = await supabase
        .from("vendor_applications" as any)
        .select("status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const latest = data as { status?: string } | null;
      if (!latest) setAppStatus("none");
      else if (latest.status === "pending") setAppStatus("pending");
      else if (latest.status === "rejected") setAppStatus("rejected");
      else setAppStatus("none");
    })();
  }, [user, roles]);

  if (loading || appStatus === "loading") return null;
  if (!user) return <Navigate to="/auth?mode=signup&redirect=/become-vendor" />;
  if (roles.includes("vendor")) return <Navigate to="/vendor" />;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = applicationSchema.safeParse(form);
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
      toast.error(first ?? "Please fix the form errors");
      return;
    }
    setSubmitting(true);

    const payload = { ...parsed.data, user_id: user.id, status: "pending" as const };
    const { data: appData, error } = await supabase
      .from("vendor_applications" as any)
      .insert(payload)
      .select("id")
      .single();
    const app = appData as unknown as { id: string } | null;

    if (error) {
      if (error.message.includes("duplicate") || error.code === "23505") {
        setAppStatus("pending");
        toast.message("You already have a pending application.");
      } else {
        toast.error(error.message);
      }
      setSubmitting(false);
      return;
    }

    const { error: notifyErr } = await supabase.functions.invoke("vendor-application", {
      body: { action: "notify_admin", application_id: app?.id },
    });
    if (notifyErr) console.warn("Admin notify failed:", notifyErr.message);

    setAppStatus("pending");
    toast.success("Application submitted! We'll email you once an admin reviews it.");
    setSubmitting(false);
  };

  return (
    <PageShell>
      <section className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
            <Store className="w-4 h-4" />For event organizers
          </div>
          <h1 className="font-display font-extrabold text-4xl md:text-5xl mt-6">Sell tickets like a pro.</h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
            Tell us about your business so we can verify you as a legitimate vendor on TikitiMW.
          </p>
        </div>

        {appStatus === "pending" && (
          <div className="mt-10 p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center max-w-xl mx-auto">
            <Clock className="w-8 h-8 mx-auto text-amber-600 mb-2" />
            <h3 className="font-display font-bold text-lg">Application under review</h3>
            <p className="text-sm text-muted-foreground mt-1">
              An admin will verify your details shortly. You'll get an email when you're approved.
            </p>
          </div>
        )}

        {appStatus !== "pending" && (
          <>
            <div className="grid md:grid-cols-3 gap-4 mt-12">
              {[
                { icon: Zap, title: "Launch in minutes", desc: "Publish events fast once approved." },
                { icon: BarChart3, title: "Live insights", desc: "Sales, revenue and attendance in real time." },
                { icon: Check, title: "Same-day payouts", desc: "Withdraw to mobile money or bank." },
              ].map((f, i) => (
                <div key={i} className="p-5 rounded-2xl bg-gradient-card border border-border shadow-card">
                  <div className="w-10 h-10 rounded-xl bg-gradient-hero grid place-items-center shadow-glow mb-3">
                    <f.icon className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <h3 className="font-display font-bold">{f.title}</h3>
                  <p className="text-muted-foreground text-sm mt-1">{f.desc}</p>
                </div>
              ))}
            </div>

            {appStatus === "rejected" && (
              <div className="mt-10 p-4 rounded-xl bg-muted border border-border text-center max-w-xl mx-auto">
                <p className="text-sm text-muted-foreground">
                  Your previous application wasn't approved. Update your details and submit again below.
                </p>
              </div>
            )}

            <form
              onSubmit={apply}
              className="mt-10 bg-card border border-border rounded-3xl p-6 md:p-8 shadow-card space-y-8"
            >
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <div>
                  <h2 className="font-display font-bold text-lg">Vendor verification</h2>
                  <p className="text-xs text-muted-foreground">All fields help us confirm you're a legitimate organizer.</p>
                </div>
              </div>

              {/* Business */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Business details</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="business_name">Business / organizer name *</Label>
                    <Input id="business_name" value={form.business_name} maxLength={120}
                      onChange={(e) => update("business_name", e.target.value)} placeholder="e.g. Sunrise Events MW" />
                  </div>
                  <div>
                    <Label>Business type *</Label>
                    <Select value={form.business_type} onValueChange={(v) => update("business_type", v as FormState["business_type"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="sole_proprietor">Sole proprietor</SelectItem>
                        <SelectItem value="company">Registered company</SelectItem>
                        <SelectItem value="ngo">NGO / Non-profit</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="registration_number">Business registration # (if any)</Label>
                    <Input id="registration_number" value={form.registration_number} maxLength={80}
                      onChange={(e) => update("registration_number", e.target.value)} placeholder="Optional" />
                  </div>
                  <div>
                    <Label htmlFor="tax_id">Tax ID / TPIN (if any)</Label>
                    <Input id="tax_id" value={form.tax_id} maxLength={80}
                      onChange={(e) => update("tax_id", e.target.value)} placeholder="Optional" />
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Contact</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contact_name">Contact person *</Label>
                    <Input id="contact_name" value={form.contact_name} maxLength={120}
                      onChange={(e) => update("contact_name", e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="contact_phone">Phone (WhatsApp) *</Label>
                    <Input id="contact_phone" value={form.contact_phone} maxLength={20}
                      onChange={(e) => update("contact_phone", e.target.value)} placeholder="+265 …" />
                  </div>
                  <div>
                    <Label htmlFor="contact_email">Email *</Label>
                    <Input id="contact_email" type="email" value={form.contact_email} maxLength={255}
                      onChange={(e) => update("contact_email", e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input id="city" value={form.city} maxLength={80}
                      onChange={(e) => update("city", e.target.value)} placeholder="Lilongwe, Blantyre…" />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="address">Physical address</Label>
                    <Input id="address" value={form.address} maxLength={200}
                      onChange={(e) => update("address", e.target.value)} placeholder="Street, area — optional" />
                  </div>
                </div>
              </div>

              {/* About events */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-bold">About your events</h3>
                <div>
                  <Label htmlFor="event_types">What kind of events do you run?</Label>
                  <Input id="event_types" value={form.event_types} maxLength={200}
                    onChange={(e) => update("event_types", e.target.value)}
                    placeholder="Concerts, weddings, conferences…" />
                </div>
                <div>
                  <Label htmlFor="description">Tell us about your business *</Label>
                  <Textarea id="description" value={form.description} maxLength={1000} rows={4}
                    onChange={(e) => update("description", e.target.value)}
                    placeholder="How long you've operated, size of past events, team, etc." />
                  <p className="text-xs text-muted-foreground mt-1">{form.description.length}/1000</p>
                </div>
                <div>
                  <Label htmlFor="website_or_social">Website or social profile</Label>
                  <Input id="website_or_social" value={form.website_or_social} maxLength={200}
                    onChange={(e) => update("website_or_social", e.target.value)}
                    placeholder="https://facebook.com/… or your website" />
                </div>
              </div>

              {/* Identity */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Identity verification</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>ID document type *</Label>
                    <Select value={form.id_document_type} onValueChange={(v) => update("id_document_type", v as FormState["id_document_type"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="national_id">National ID</SelectItem>
                        <SelectItem value="passport">Passport</SelectItem>
                        <SelectItem value="drivers_license">Driver's license</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="id_number">ID number *</Label>
                    <Input id="id_number" value={form.id_number} maxLength={60}
                      onChange={(e) => update("id_number", e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Terms */}
              <label className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border border-border cursor-pointer">
                <Checkbox
                  checked={form.agreed_to_terms}
                  onCheckedChange={(v) => update("agreed_to_terms", Boolean(v))}
                  className="mt-0.5"
                />
                <span className="text-sm text-muted-foreground">
                  I confirm the information above is accurate, I own or am authorised to represent this business,
                  and I agree to TikitiMW's vendor terms including the platform fees and refund policy.
                </span>
              </label>

              <Button type="submit" variant="gold" size="xl" className="w-full" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit vendor application"}
              </Button>
            </form>
          </>
        )}
      </section>
    </PageShell>
  );
};

export default BecomeVendor;
