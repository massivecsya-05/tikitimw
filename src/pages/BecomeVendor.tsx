import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, Store, Zap, BarChart3, Clock } from "lucide-react";

type AppStatus = "none" | "pending" | "rejected" | "loading";

const BecomeVendor = () => {
  const { user, roles, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [appStatus, setAppStatus] = useState<AppStatus>("loading");

  useEffect(() => {
    if (!user || roles.includes("vendor")) return;
    (async () => {
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

  const apply = async () => {
    setSubmitting(true);
    const { data: appData, error } = await supabase
      .from("vendor_applications" as any)
      .insert({ user_id: user.id, status: "pending" })
      .select("id")
      .single();
    const app = appData as { id: string } | null;

    if (error) {
      if (error.message.includes("duplicate") || error.code === "23505") {
        setAppStatus("pending");
        toast.message("You already have a pending application.");
        setSubmitting(false);
        return;
      }
      toast.error(error.message);
      setSubmitting(false);
      return;
    }

    const { error: notifyErr } = await supabase.functions.invoke("vendor-application", {
      body: { action: "notify_admin", application_id: app?.id },
    });
    if (notifyErr) console.warn("Admin notify failed:", notifyErr.message);

    setAppStatus("pending");
    toast.success("Application submitted! We'll email you once an admin approves your vendor account.");
    setSubmitting(false);
  };

  return (
    <PageShell>
      <section className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
            <Store className="w-4 h-4" />For event organizers
          </div>
          <h1 className="font-display font-extrabold text-5xl md:text-6xl mt-6">Sell tickets like a pro.</h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
            Join hundreds of Malawian organizers reaching new audiences and getting paid faster than ever.
          </p>
        </div>

        {appStatus === "pending" && (
          <div className="mt-10 p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center max-w-xl mx-auto">
            <Clock className="w-8 h-8 mx-auto text-amber-600 mb-2" />
            <h3 className="font-display font-bold text-lg">Application under review</h3>
            <p className="text-sm text-muted-foreground mt-1">
              An admin will verify your account shortly. You'll receive an email when you're approved as a vendor.
            </p>
          </div>
        )}

        {appStatus === "rejected" && (
          <div className="mt-10 p-6 rounded-2xl bg-muted border border-border text-center max-w-xl mx-auto">
            <p className="text-sm text-muted-foreground">Your previous application wasn't approved. You can apply again below.</p>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6 mt-14">
          {[
            { icon: Zap, title: "Launch in minutes", desc: "Create an event and publish tickets in under 5 minutes." },
            { icon: BarChart3, title: "Live insights", desc: "Track sales, revenue, and attendance in real time." },
            { icon: Check, title: "Same-day payouts", desc: "Withdraw to mobile money or bank — zero waiting." },
          ].map((f, i) => (
            <div key={i} className="p-7 rounded-3xl bg-gradient-card border border-border shadow-card">
              <div className="w-12 h-12 rounded-2xl bg-gradient-hero grid place-items-center shadow-glow mb-4">
                <f.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <h3 className="font-display font-bold text-lg">{f.title}</h3>
              <p className="text-muted-foreground text-sm mt-1">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 p-10 rounded-3xl bg-gradient-hero text-primary-foreground text-center shadow-glow">
          <h2 className="font-display font-extrabold text-3xl">Ready to start selling?</h2>
          <p className="opacity-90 mt-2">
            {appStatus === "pending"
              ? "Your application is waiting for admin approval."
              : "Request a vendor account — approval is quick and free."}
          </p>
          {appStatus !== "pending" && (
            <Button variant="gold" size="xl" className="mt-6" onClick={apply} disabled={submitting}>
              {submitting ? "Submitting…" : "Apply to become a vendor"}
            </Button>
          )}
        </div>
      </section>
    </PageShell>
  );
};

export default BecomeVendor;
