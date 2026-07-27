import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { PasswordInput } from "@/components/PasswordInput";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LogOut, User, Phone, Mail, KeyRound, ChevronRight, Shield, Store } from "lucide-react";

const Profile = () => {
  const { user, roles, loading, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => setProfile(data));
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;

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
                {(roles.includes("admin") || roles.includes("vendor")) && (
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
