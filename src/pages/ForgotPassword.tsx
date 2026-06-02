import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, MailCheck } from "lucide-react";
import { Logo } from "@/components/Logo";

const emailSchema = z.string().trim().email("Invalid email").max(255);

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const ev = emailSchema.safeParse(email.trim());
    if (!ev.success) return toast.error(ev.error.errors[0].message);

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(ev.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) return toast.error(error.message);
    setSent(true);
    toast.success("Password reset link sent. Check your email.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/auth" className="flex items-center gap-2 font-display font-extrabold text-xl mb-8">
          <span className="w-9 h-9 rounded-xl bg-gradient-hero grid place-items-center shadow-glow">
            <Ticket className="w-5 h-5 text-primary-foreground" />
          </span>
          TikitiMW
        </Link>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 text-green-600 grid place-items-center">
              <MailCheck className="w-8 h-8" />
            </div>
            <h1 className="font-display font-bold text-2xl">Check your email</h1>
            <p className="text-muted-foreground">
              We sent a password reset link to <span className="font-medium text-foreground">{email}</span>.
              Click the link in the email to set a new password.
            </p>
            <div className="flex justify-center">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </Link>
            </div>
          </div>
        ) : (
          <>
            <h1 className="font-display font-bold text-3xl mb-2">Reset your password</h1>
            <p className="text-muted-foreground mb-6">
              Enter your email address and we will send you a link to reset your password.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input
                  name="email"
                  type="email"
                  required
                  className="h-11"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                {loading ? "Sending…" : "Send reset link"}
              </Button>
              <p className="text-sm text-center">
                Remember your password?{" "}
                <Link to="/auth" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
