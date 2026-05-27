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
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { LogOut } from "lucide-react";

const Profile = () => {
  const { user, loading, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => setProfile(data));
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;

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
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    navigate("/");
  };

  return (
    <PageShell>
      <div className="container mx-auto px-4 py-12 pb-28 md:pb-12 max-w-xl">
        <div className="mb-8">
          <h1 className="font-display font-extrabold text-4xl">{t("profile.title")}</h1>
        </div>

        <form onSubmit={save} className="space-y-4 bg-gradient-card border border-border rounded-3xl p-6 md:p-8 shadow-card">
          <div>
            <Label>Email</Label>
            <Input value={user.email ?? ""} disabled className="h-11" />
          </div>
          <div>
            <Label>Full name</Label>
            <Input name="full_name" defaultValue={profile?.full_name ?? ""} className="h-11" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input name="phone" defaultValue={profile?.phone ?? ""} placeholder="+265..." className="h-11" />
          </div>
          <Button type="submit" variant="hero" size="lg" className="w-full min-h-12" disabled={saving}>
            {saving ? t("profile.saving") : t("profile.save")}
          </Button>
        </form>

        <Separator className="my-8" />

        <form
          onSubmit={changePassword}
          className="space-y-4 bg-gradient-card border border-border rounded-3xl p-6 md:p-8 shadow-card"
        >
          <h2 className="font-display font-bold text-xl">{t("profile.passwordTitle")}</h2>
          <div>
            <Label>{t("profile.currentPassword")}</Label>
            <PasswordInput name="current_password" required autoComplete="current-password" className="h-11" />
          </div>
          <div>
            <Label>{t("profile.newPassword")}</Label>
            <PasswordInput name="new_password" required minLength={6} autoComplete="new-password" className="h-11" />
          </div>
          <div>
            <Label>{t("profile.confirmPassword")}</Label>
            <PasswordInput name="confirm_password" required minLength={6} autoComplete="new-password" className="h-11" />
          </div>
          <Button type="submit" variant="outline" size="lg" className="w-full min-h-12" disabled={changingPassword}>
            {changingPassword ? t("profile.updatingPassword") : t("profile.updatePassword")}
          </Button>
        </form>

        <Separator className="my-8" />

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full min-h-12 gap-2"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          <LogOut className="w-4 h-4" />
          {signingOut ? "…" : t("profile.signOut")}
        </Button>
      </div>
    </PageShell>
  );
};

export default Profile;
