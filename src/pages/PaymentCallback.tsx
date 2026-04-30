import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, AlertTriangle } from "lucide-react";

type Status = "checking" | "paid" | "pending" | "failed";

const PaymentCallback = () => {
  const [params] = useSearchParams();
  const orderId = params.get("order_id");
  const [status, setStatus] = useState<Status>("checking");
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (!orderId) { setStatus("failed"); return; }
    let cancelled = false;

    const poll = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("status")
        .eq("id", orderId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) { setStatus("failed"); return; }
      if (data.status === "paid") { setStatus("paid"); return; }
      if (data.status === "cancelled" || data.status === "refunded") {
        setStatus("failed"); return;
      }
      // Still pending — try again up to ~30 seconds total
      if (tries >= 15) { setStatus("pending"); return; }
      setTimeout(() => setTries((t) => t + 1), 2000);
    };
    poll();
    return () => { cancelled = true; };
  }, [orderId, tries]);

  return (
    <PageShell>
      <div className="container mx-auto px-4 py-24 max-w-md text-center">
        {status === "checking" && (
          <>
            <Loader2 className="w-14 h-14 mx-auto text-primary animate-spin mb-4" />
            <h1 className="font-display font-bold text-3xl">Confirming payment…</h1>
            <p className="text-muted-foreground mt-2">Hang tight while we verify with the payment provider.</p>
          </>
        )}
        {status === "paid" && (
          <>
            <CheckCircle2 className="w-14 h-14 mx-auto text-emerald-500 mb-4" />
            <h1 className="font-display font-bold text-3xl">Payment received!</h1>
            <p className="text-muted-foreground mt-2">Your tickets are ready. We'll also email them to you.</p>
            <Button asChild variant="hero" size="lg" className="mt-6">
              <Link to="/dashboard">View my tickets</Link>
            </Button>
          </>
        )}
        {status === "pending" && (
          <>
            <Loader2 className="w-14 h-14 mx-auto text-amber-500 mb-4" />
            <h1 className="font-display font-bold text-3xl">Still processing</h1>
            <p className="text-muted-foreground mt-2">
              Your payment is taking longer than usual. Check your dashboard in a minute — if it doesn't show
              up, contact support.
            </p>
            <Button asChild variant="outline" size="lg" className="mt-6">
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
          </>
        )}
        {status === "failed" && (
          <>
            <AlertTriangle className="w-14 h-14 mx-auto text-destructive mb-4" />
            <h1 className="font-display font-bold text-3xl">Payment not completed</h1>
            <p className="text-muted-foreground mt-2">The transaction was cancelled or failed. No money was taken.</p>
            <Button asChild variant="hero" size="lg" className="mt-6">
              <Link to="/events">Browse events</Link>
            </Button>
          </>
        )}
      </div>
    </PageShell>
  );
};

export default PaymentCallback;
