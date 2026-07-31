import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { CheckCircle2, Loader2 } from "lucide-react";

const EmailVerified = () => {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (loading || !user) return;
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          nav("/");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, user, nav]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero px-4">
      <div className="bg-card rounded-3xl border border-border shadow-glow p-8 md:p-10 max-w-md w-full text-center">
        <Link to="/" className="inline-flex items-center gap-2 font-display font-extrabold text-xl mb-8">
          <Logo className="w-9 h-9" />
          TikitiMW
        </Link>

        {loading ? (
          <>
            <Loader2 className="w-14 h-14 mx-auto text-primary animate-spin mb-4" />
            <h1 className="font-display font-bold text-2xl">Confirming your email\u2026</h1>
          </>
        ) : user ? (
          <>
            <div className="w-16 h-16 rounded-full bg-secondary/15 grid place-items-center mx-auto mb-4">
              <CheckCircle2 className="w-9 h-9 text-secondary" />
            </div>
            <h1 className="font-display font-bold text-2xl mb-2">Email verified!</h1>
            <p className="text-muted-foreground mb-6">
              Your account is ready. Taking you to TikitiMW in {countdown}\u2026
            </p>
            <Button asChild variant="hero" size="lg" className="w-full min-h-12">
              <Link to="/">Continue now</Link>
            </Button>
          </>
        ) : (
          <>
            <h1 className="font-display font-bold text-2xl mb-2">Link expired or already used</h1>
            <p className="text-muted-foreground mb-6">
              This verification link is no longer valid. Please sign in \u2014 if your email still needs confirming, you can request a new link.
            </p>
            <Button asChild variant="hero" size="lg" className="w-full min-h-12">
              <Link to="/auth">Go to sign in</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default EmailVerified;
