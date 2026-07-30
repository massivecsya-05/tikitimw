import { useEffect, useState } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { PasswordInput } from "@/components/PasswordInput";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import {
  LogOut, User, Phone, Mail, KeyRound, ChevronRight, Shield, Store, FileText,
  ShieldCheck, CheckCircle2, Bell, Check, HelpCircle, Search, Ticket, QrCode,
} from "lucide-react";
import { useIsStandalone } from "@/hooks/use-standalone";
import { useNotifications, useNotificationPreference } from "@/hooks/useNotifications";

const faqs = [
  { q: "Is my payment secure?", a: "Yes. Payments are processed through licensed mobile money and card providers. TikitiMW never stores your PIN or card CVV." },
  { q: "What if the event is cancelled?", a: "If an organiser cancels, paid ticket holders are notified by email/SMS and refunds are processed according to the event's policy." },
  { q: "How do I get my ticket?", a: "After payment you'll see your QR ticket in My Tickets and receive a copy by email. Show the QR code at the gate." },
  { q: "Which payment methods are accepted?", a: "Airtel Money, TNM Mpamba, Visa/Mastercard, and bank transfer are supported at checkout." },
];

const Profile = () => {
  const { user, roles, loading, signOut } = useAuth();
  const isStandalone = useIsStandalone();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);
  const { data: notifications = [], unreadCount, markRead, markAllRead } = useNotifications();
  const { data: eventNotificationsEnabled = true, update: updatePreference } = useNotificationPreference();

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => setProfile(data));
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;

  const isVendorOrAdmin = roles.includes("vendor") || roles.includes("admin");
  const initial = (profile?.full_name?.[0] ?? user.email?.[0] ?? "?").toUpperCase();

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: fd.get("full_name") as string,
      phone: fd.get("phone") as string,
    }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    setProfile((p: any) => ({ ...p, full_name: fd.get("full_name"), phone: fd.get("phone") }));
    toast.success(t("profile.updated"));
  };

  const changePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const current = String(fd.get("current_password") ?? "");
    const password = String(fd.get("new_password") ?? "");
    const confirm = String(fd.get("confirm_password") ?? "");

    if (password.length < 6) return toast.error(t("profile.passwordTooShort"));
    if (password !== confirm) return toast.error(t("profile.passwordMismatch"));
    if (!user.email) return toast.error("No email on account");

    setChangingPassword(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current,
    });
    if (signInError) {
      setChangingPassword(false);
      return toast.error(t("profile.wrongPassword"));
    }

    const { error } = await supabase.auth.updateUser({ password });
    setChangingPassword(false);
    if (error) return toast.error(error.message);
    toast.success(t("profile.passwordUpdated"));
    e.currentTarget.reset();
    setShowPasswordForm(false);
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    navigate("/");
  };

  return (
    <PageShell>
      <div className="pb-28 md:pb-12">
        {/* Profile header banner */}
        <div className="bg-gradient-hero px-4 pt-10 pb-16 md:pt-16 md:pb-24 relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
          <div className="container mx-auto max-w-xl relative">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/15 backdrop-blur border border-white/25 grid place-items-center text-2xl md:text-3xl font-display font-extrabold text-primary-foreground shrink-0">
                {initial}
              </div>
              <div className="min-w-0">
                <h1 className="font-display font-extrabold text-xl md:text-2xl text-primary-foreground truncate">
                  {profile?.full_name || "Your account"}
                </h1>
                <p className="text-sm text-primary-foreground/85 truncate">{user.email}</p>
                {isVendorOrAdmin && (
                  <div className="flex gap-1.5 mt-2">
                    {roles.includes("admin") && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-white/20 text-primary-foreground px-2 py-0.5 rounded-full">
                        <Shield className="w-3 h-3" /> Admin
                      </span>
                    )}
                    {roles.includes("vendor") && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-white/20 text-primary-foreground px-2 py-0.5 rounded-full">
                        <Store className="w-3 h-3" /> Vendor
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content pulled up over the banner */}
        <div className="container mx-auto px-4 -mt-8 md:-mt-12 max-w-xl space-y-4">
          {/* Personal details card */}
          <form onSubmit={save} className="bg-card border border-border/60 rounded-2xl p-5 shadow-card space-y-4">
            <h2 className="font-display font-bold text-sm uppercase tracking-wide text-muted-foreground">
              Personal details
            </h2>
            <div className="space-y-3">
              <div>
                <Label className="text-xs flex items-center gap-1.5 mb-1.5"><Mail className="w-3.5 h-3.5" /> Email</Label>
                <Input value={user.email ?? ""} disabled className="h-12 bg-muted/40" />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1.5 mb-1.5"><User className="w-3.5 h-3.5" /> Full name</Label>
                <Input name="full_name" defaultValue={profile?.full_name ?? ""} className="h-12" />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1.5 mb-1.5"><Phone className="w-3.5 h-3.5" /> Phone</Label>
                <Input name="phone" defaultValue={profile?.phone ?? ""} placeholder="+265..." className="h-12" />
              </div>
            </div>
            <Button type="submit" variant="hero" size="lg" className="w-full min-h-12" disabled={saving}>
              {saving ? t("profile.saving") : t("profile.save")}
            </Button>
          </form>

          {/* Vendor entry point */}
          {isVendorOrAdmin ? (
            <Link to="/organiser/dashboard" className="flex items-center gap-3 p-5 min-h-12 bg-card border border-border/60 rounded-2xl shadow-card hover:bg-muted/40 transition-colors">
              <Store className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm flex-1 font-display font-bold uppercase tracking-wide text-muted-foreground">Organiser dashboard</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          ) : (
            <Link to="/become-vendor" className="flex items-center gap-3 p-5 min-h-12 bg-card border border-border/60 rounded-2xl shadow-card hover:bg-muted/40 transition-colors">
              <Store className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm flex-1 font-display font-bold uppercase tracking-wide text-muted-foreground">Become a vendor</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          )}

          {/* Notifications card */}
          <div className="bg-card border border-border/60 rounded-2xl shadow-card overflow-hidden">
            <button
              type="button"
              onClick={() => setShowNotifications((v) => !v)}
              className="w-full flex items-center justify-between p-5 min-h-12"
            >
              <span className="flex items-center gap-2 font-display font-bold text-sm uppercase tracking-wide text-muted-foreground">
                <Bell className="w-4 h-4" /> Notifications
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                    {unreadCount}
                  </span>
                )}
              </span>
              <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${showNotifications ? "rotate-90" : ""}`} />
            </button>
            {showNotifications && (
              <div className="px-5 pb-5 border-t border-border/60 pt-4 space-y-4">
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <span className="text-sm">Notify me about new events</span>
                  <input
                    type="checkbox"
                    checked={eventNotificationsEnabled}
                    onChange={(e) => updatePreference.mutate(e.target.checked)}
                    className="w-5 h-5 accent-primary"
                  />
                </label>

                {notifications.length > 0 && unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllRead.mutate()}
                    className="text-xs text-primary font-medium flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Mark all as read
                  </button>
                )}

                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No notifications yet</p>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => !n.is_read && markRead.mutate(n.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-colors ${
                          n.is_read ? "border-border/40 bg-transparent" : "border-primary/30 bg-primary/5"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{n.title}</p>
                            {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {new Date(n.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* How it works card */}
          <div className="bg-card border border-border/60 rounded-2xl shadow-card overflow-hidden">
            <button
              type="button"
              onClick={() => setShowHowItWorks((v) => !v)}
              className="w-full flex items-center justify-between p-5 min-h-12"
            >
              <span className="flex items-center gap-2 font-display font-bold text-sm uppercase tracking-wide text-muted-foreground">
                <Ticket className="w-4 h-4" /> {t("how.title")}
              </span>
              <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${showHowItWorks ? "rotate-90" : ""}`} />
            </button>
            {showHowItWorks && (
              <div className="px-5 pb-5 border-t border-border/60 pt-4 space-y-4">
                {[
                  { icon: Search, title: t("how.step1"), desc: "Find concerts, sports, festivals and more across Malawi." },
                  { icon: Ticket, title: t("how.step2"), desc: "Pay with mobile money or card in under a minute." },
                  { icon: QrCode, title: t("how.step3"), desc: "Your unique QR ticket \u2014 scan once at the gate." },
                ].map((s, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-hero grid place-items-center">
                      <s.icon className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-primary">Step {i + 1}</div>
                      <h3 className="font-display font-bold text-sm">{s.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FAQ card */}
          <div className="bg-card border border-border/60 rounded-2xl shadow-card overflow-hidden">
            <button
              type="button"
              onClick={() => setShowFAQ((v) => !v)}
              className="w-full flex items-center justify-between p-5 min-h-12"
            >
              <span className="flex items-center gap-2 font-display font-bold text-sm uppercase tracking-wide text-muted-foreground">
                <HelpCircle className="w-4 h-4" /> {t("faq.title")}
              </span>
              <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${showFAQ ? "rotate-90" : ""}`} />
            </button>
            {showFAQ && (
              <div className="px-5 pb-5 border-t border-border/60 pt-2">
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((f, i) => (
                    <AccordionItem key={i} value={`faq-${i}`}>
                      <AccordionTrigger className="text-left font-semibold text-sm">{f.q}</AccordionTrigger>
                      <AccordionContent className="text-muted-foreground text-sm">{f.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}
          </div>

          {/* Security card - collapsible on mobile to reduce clutter */}
          <div className="bg-card border border-border/60 rounded-2xl shadow-card overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPasswordForm((v) => !v)}
              className="w-full flex items-center justify-between p-5 min-h-12"
            >
              <span className="flex items-center gap-2 font-display font-bold text-sm uppercase tracking-wide text-muted-foreground">
                <KeyRound className="w-4 h-4" /> {t("profile.passwordTitle")}
              </span>
              <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${showPasswordForm ? "rotate-90" : ""}`} />
            </button>
            {showPasswordForm && (
              <form onSubmit={changePassword} className="px-5 pb-5 space-y-3 border-t border-border/60 pt-4">
                <div>
                  <Label className="text-xs mb-1.5 block">{t("profile.currentPassword")}</Label>
                  <PasswordInput name="current_password" required autoComplete="current-password" className="h-12" />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">{t("profile.newPassword")}</Label>
                  <PasswordInput name="new_password" required minLength={6} autoComplete="new-password" className="h-12" />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">{t("profile.confirmPassword")}</Label>
                  <PasswordInput name="confirm_password" required minLength={6} autoComplete="new-password" className="h-12" />
                </div>
                <Button type="submit" variant="outline" size="lg" className="w-full min-h-12" disabled={changingPassword}>
                  {changingPassword ? t("profile.updatingPassword") : t("profile.updatePassword")}
                </Button>
              </form>
            )}
          </div>

          {/* Legal \u2014 the footer with these links is desktop-only, so mobile/app users need this. */}
          <div className="bg-card border border-border/60 rounded-2xl shadow-card overflow-hidden">
            <Link to="/terms" className="flex items-center gap-3 p-4 min-h-12 border-b border-border/60 hover:bg-muted/40 transition-colors">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm flex-1">Terms of Service</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
            <Link to="/privacy" className="flex items-center gap-3 p-4 min-h-12 hover:bg-muted/40 transition-colors">
              <ShieldCheck className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm flex-1">Privacy Policy</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          </div>

          {isStandalone && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground py-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />
              Running as installed app
            </div>
          )}

          {/* Sign out \u2014 always last */}
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full min-h-12 gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            <LogOut className="w-4 h-4" />
            {signingOut ? "\u2026" : t("profile.signOut")}
          </Button>
        </div>
      </div>
    </PageShell>
  );
};

export default Profile;
