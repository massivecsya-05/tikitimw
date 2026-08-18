import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { APP_URL } from "@/lib/env";
import { MailCheck } from "lucide-react";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path fill="#4285F4" d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.56-5.17 3.56-8.87Z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.87-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.28v3.09A12 12 0 0 0 12 24Z" />
    <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.28a12 12 0 0 0 0 10.76l3.99-3.09Z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.23 0 12 0A12 12 0 0 0 1.28 6.62l3.99 3.09C6.22 6.86 8.87 4.75 12 4.75Z" />
  </svg>
);


const emailSchema = z.string().trim().email("Invalid email").max(255);
const passwordSchema = z.string().min(6, "Min 6 characters").max(72);
const nameSchema = z.string().trim().min(2, "Min 2 characters").max(100);

const Auth = () => {
  const { t } = useLanguage();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") ?? "/";
  const initialMode = params.get("mode") === "signup" ? "signup" : "signin";
  const [tab, setTab] = useState(initialMode);
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [checkEmailFor, setCheckEmailFor] = useState<string | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    if (checkEmailFor && user) {
      toast.success("Email verified! You're signed in.");
      nav(redirect);
    }
  }, [checkEmailFor, user, nav, redirect]);

  const signIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = fd.get("email") as string;
    const password = fd.get("password") as string;
    const ev = emailSchema.safeParse(email); if (!ev.success) return toast.error(ev.error.errors[0].message);
    const pv = passwordSchema.safeParse(password); if (!pv.success) return toast.error(pv.error.errors[0].message);
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: ev.data, password: pv.data });
    if (error) { setLoading(false); return toast.error(error.message); }

    let destination = redirect;
    if (data.user) {
      const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
      const isAdmin = roleRows?.some((r) => r.role === "admin");
      if (isAdmin) destination = "/admin";
    }
    setLoading(false);
    toast.success("Welcome back!");
    nav(destination);
  };

  // forgot password is handled on the /forgot-password page

  const signUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!agreedToTerms) {
      toast.error("Please agree to the Terms of Service and Privacy Policy to continue");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const name = fd.get("name") as string;
    const email = fd.get("email") as string;
    const password = fd.get("password") as string;
    const phone = fd.get("phone") as string;
    const nv = nameSchema.safeParse(name); if (!nv.success) return toast.error(nv.error.errors[0].message);
    const ev = emailSchema.safeParse(email); if (!ev.success) return toast.error(ev.error.errors[0].message);
    const pv = passwordSchema.safeParse(password); if (!pv.success) return toast.error(pv.error.errors[0].message);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: ev.data, password: pv.data,
        options: { emailRedirectTo: `${APP_URL}/email-verified`, data: { full_name: nv.data, phone } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      toast.error("An account with this email already exists - please sign in.");
      setTab("signin");
      return;
    }
    // Do NOT navigate into the app here \u2014 Supabase has not created a session yet
    // (email confirmation is required), so silently proceeding would either dead-end
    // or, worse, mask the fact that the email hasn't actually been verified.
    setCheckEmailFor(ev.data);
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setLoading(false);
      return toast.error(error.message ?? "Google sign-in failed");
    }
  };

  const googleBlock = (
    <>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full gap-2"
        onClick={signInWithGoogle}
        disabled={loading}
      >
        <GoogleIcon />
        Continue with Google
      </Button>
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>
    </>
  );



  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-gradient-hero text-primary-foreground overflow-hidden">
        <div className="absolute -right-32 -bottom-32 w-96 h-96 rounded-full bg-accent/30 blur-3xl animate-float" />
        <Link to="/" className="flex items-center gap-2 font-display font-extrabold text-2xl relative">
          <Logo className="w-10 h-10 rounded-xl" />
          TikitiMW
        </Link>
        <div className="relative">
          <h1 className="font-display font-extrabold text-5xl leading-tight">Malawi's events,<br/>one tap away.</h1>
          <p className="mt-4 text-lg opacity-90 max-w-md">Concerts, festivals, sports, conferences \u2014 book and pay with what works for you.</p>
        </div>
        <p className="text-sm opacity-80 relative">Trusted by event organizers across Lilongwe, Blantyre, Mzuzu and beyond.</p>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden flex items-center gap-2 font-display font-extrabold text-xl mb-8">
            <Logo className="w-9 h-9" />
            TikitiMW
          </Link>

          {checkEmailFor ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 grid place-items-center mx-auto mb-4">
                <MailCheck className="w-9 h-9 text-primary" />
              </div>
              <h2 className="font-display font-bold text-3xl mb-2">Check your inbox</h2>
              <p className="text-muted-foreground mb-1">
                We sent a confirmation link to
              </p>
              <p className="font-semibold mb-6">{checkEmailFor}</p>
              <p className="text-sm text-muted-foreground mb-6">
                Click the link in that email to verify your account and get signed in. Didn't get it? Check spam, or try signing up again in a minute.
              </p>
              <Button variant="outline" className="w-full min-h-12" onClick={() => setCheckEmailFor(null)}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <Tabs value={tab} onValueChange={setTab as any}>
              <TabsList className="grid grid-cols-2 w-full mb-6">
                <TabsTrigger value="signin">{t("auth.signIn")}</TabsTrigger>
                <TabsTrigger value="signup">{t("auth.signUp")}</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <h2 className="font-display font-bold text-3xl mb-1">Welcome back</h2>
                <p className="text-muted-foreground mb-6">Sign in to access your tickets</p>
                {googleBlock}

                <form onSubmit={signIn} className="space-y-4">
                  <div><Label>Email</Label><Input name="email" type="email" required className="h-11" /></div>
                  <div>
                    <Label>Password</Label>
                    <PasswordInput name="password" required className="h-11" />
                    <div className="flex justify-end mt-1">
                      <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                  </div>
                  <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>{loading ? "..." : t("auth.signIn")}</Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <h2 className="font-display font-bold text-3xl mb-1">Create your account</h2>
                <p className="text-muted-foreground mb-6">Start booking tickets today</p>
                {googleBlock}

                <form onSubmit={signUp} className="space-y-4">
                  <div><Label>Full name</Label><Input name="name" required className="h-11" /></div>
                  <div><Label>Email</Label><Input name="email" type="email" required className="h-11" /></div>
                  <div><Label>Phone (optional)</Label><Input name="phone" placeholder="+265..." className="h-11" /></div>
                  <div><Label>Password</Label><PasswordInput name="password" required minLength={6} className="h-11" /></div>
                  <div className="flex items-start gap-2.5 pt-1">
                    <Checkbox
                      id="agree-terms"
                      checked={agreedToTerms}
                      onCheckedChange={(v) => setAgreedToTerms(v === true)}
                      className="mt-0.5"
                    />
                    <Label htmlFor="agree-terms" className="text-sm font-normal text-muted-foreground leading-snug cursor-pointer">
                      I agree to the{" "}
                      <Link to="/terms" target="_blank" className="text-primary hover:underline">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link to="/privacy" target="_blank" className="text-primary hover:underline">
                        Privacy Policy
                      </Link>
                    </Label>
                  </div>
                  <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading || !agreedToTerms}>{loading ? "..." : t("auth.signUp")}</Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;




