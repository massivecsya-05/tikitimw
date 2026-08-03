import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";

const ResetPassword = () => {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase JS auto-handles the recovery hash and emits PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const search = new URLSearchParams(window.location.search);
    const errDesc = hash.get("error_description") ?? search.get("error_description");
    if (errDesc) toast.error(decodeURIComponent(errDesc.replace(/\+/g, " ")));

    const code = search.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) toast.error(error.message);
        else setReady(true);
      });
    }

    supabase.auth.getSession().then(({ data: { session } }) => { if (session) setReady(true); });
    return () => subscription.unsubscribe();
  }, []);


  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    if (password !== confirm) return toast.error("Passwords do not match");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    nav("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 font-display font-extrabold text-xl mb-8">
          <Logo className="w-9 h-9" />
          TikitiMW
        </Link>
        <h1 className="font-display font-bold text-3xl mb-2">Set a new password</h1>
        <p className="text-muted-foreground mb-6">
          {ready ? "Enter and confirm your new password." : "Validating your reset link…"}
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div><Label>New password</Label><PasswordInput name="password" required minLength={6} className="h-11" /></div>
          <div><Label>Confirm password</Label><PasswordInput name="confirm" required minLength={6} className="h-11" /></div>
          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading || !ready}>
            {loading ? "Updating…" : "Update password"}
          </Button>
          <p className="text-sm text-center"><Link to="/auth" className="text-primary hover:underline">Back to sign in</Link></p>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
