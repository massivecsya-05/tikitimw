import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Ticket } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const emailSchema = z.string().trim().email("Invalid email").max(255);
const passwordSchema = z.string().min(6, "Min 6 characters").max(72);
const nameSchema = z.string().trim().min(2, "Min 2 characters").max(100);

const Auth = () => {
  const { t } = useLanguage();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") ?? "/dashboard";
  const initialMode = params.get("mode") === "signup" ? "signup" : "signin";
  const [tab, setTab] = useState(initialMode);
  const [loading, setLoading] = useState(false);

  const signIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = fd.get("email") as string;
    const password = fd.get("password") as string;
    const ev = emailSchema.safeParse(email); if (!ev.success) return toast.error(ev.error.errors[0].message);
    const pv = passwordSchema.safeParse(password); if (!pv.success) return toast.error(pv.error.errors[0].message);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: ev.data, password: pv.data });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    nav(redirect);
  };

  // forgot password is handled on the /forgot-password page

  const signUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = fd.get("name") as string;
    const email = fd.get("email") as string;
    const password = fd.get("password") as string;
    const phone = fd.get("phone") as string;
    const nv = nameSchema.safeParse(name); if (!nv.success) return toast.error(nv.error.errors[0].message);
    const ev = emailSchema.safeParse(email); if (!ev.success) return toast.error(ev.error.errors[0].message);
    const pv = passwordSchema.safeParse(password); if (!pv.success) return toast.error(pv.error.errors[0].message);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: ev.data, password: pv.data,
      options: { emailRedirectTo: window.location.origin, data: { full_name: nv.data, phone } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created! Check your email to confirm.");
    nav(redirect);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-gradient-hero text-primary-foreground overflow-hidden">
        <div className="absolute -right-32 -bottom-32 w-96 h-96 rounded-full bg-accent/30 blur-3xl animate-float" />
        <Link to="/" className="flex items-center gap-2 font-display font-extrabold text-2xl relative">
          <span className="w-10 h-10 rounded-xl bg-background/20 backdrop-blur grid place-items-center"><Ticket className="w-6 h-6" /></span>
          TikitiMW
        </Link>
        <div className="relative">
          <h1 className="font-display font-extrabold text-5xl leading-tight">Malawi's events,<br/>one tap away.</h1>
          <p className="mt-4 text-lg opacity-90 max-w-md">Concerts, festivals, sports, conferences — book and pay with what works for you.</p>
        </div>
        <p className="text-sm opacity-80 relative">Trusted by event organizers across Lilongwe, Blantyre, Mzuzu and beyond.</p>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden flex items-center gap-2 font-display font-extrabold text-xl mb-8">
            <span className="w-9 h-9 rounded-xl bg-gradient-hero grid place-items-center shadow-glow"><Ticket className="w-5 h-5 text-primary-foreground" /></span>
            TikitiMW
          </Link>
          <Tabs value={tab} onValueChange={setTab as any}>
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="signin">{t("auth.signIn")}</TabsTrigger>
              <TabsTrigger value="signup">{t("auth.signUp")}</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <h2 className="font-display font-bold text-3xl mb-1">Welcome back</h2>
              <p className="text-muted-foreground mb-6">Sign in to access your tickets</p>
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
              <form onSubmit={signUp} className="space-y-4">
                <div><Label>Full name</Label><Input name="name" required className="h-11" /></div>
                <div><Label>Email</Label><Input name="email" type="email" required className="h-11" /></div>
                <div><Label>Phone (optional)</Label><Input name="phone" placeholder="+265..." className="h-11" /></div>
                <div><Label>Password</Label><PasswordInput name="password" required minLength={6} className="h-11" /></div>
                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>{loading ? "..." : t("auth.signUp")}</Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Auth;
