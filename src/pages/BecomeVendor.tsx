import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, Store, Zap, BarChart3 } from "lucide-react";

const BecomeVendor = () => {
  const { user, roles, loading, refreshRoles } = useAuth();
  const nav = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (!user) return <Navigate to="/auth?mode=signup&redirect=/become-vendor" />;
  if (roles.includes("vendor")) return <Navigate to="/vendor" />;

  const apply = async () => {
    setSubmitting(true);
    const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role: "vendor" });
    if (error && !error.message.includes("duplicate")) {
      toast.error(error.message); setSubmitting(false); return;
    }
    await refreshRoles();
    toast.success("Welcome aboard, vendor! 🎉");
    nav("/vendor");
  };

  return (
    <PageShell>
      <section className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
            <Store className="w-4 h-4"/>For event organizers
          </div>
          <h1 className="font-display font-extrabold text-5xl md:text-6xl mt-6">Sell tickets like a pro.</h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
            Join hundreds of Malawian organizers reaching new audiences and getting paid faster than ever.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-14">
          {[
            { icon: Zap, title: "Launch in minutes", desc: "Create an event and publish tickets in under 5 minutes." },
            { icon: BarChart3, title: "Live insights", desc: "Track sales, revenue, and attendance in real time." },
            { icon: Check, title: "Same-day payouts", desc: "Withdraw to mobile money or bank — zero waiting." },
          ].map((f, i) => (
            <div key={i} className="p-7 rounded-3xl bg-gradient-card border border-border shadow-card">
              <div className="w-12 h-12 rounded-2xl bg-gradient-hero grid place-items-center shadow-glow mb-4"><f.icon className="w-5 h-5 text-primary-foreground"/></div>
              <h3 className="font-display font-bold text-lg">{f.title}</h3>
              <p className="text-muted-foreground text-sm mt-1">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 p-10 rounded-3xl bg-gradient-hero text-primary-foreground text-center shadow-glow">
          <h2 className="font-display font-extrabold text-3xl">Ready to start selling?</h2>
          <p className="opacity-90 mt-2">Activate your vendor account instantly — it's free.</p>
          <Button variant="gold" size="xl" className="mt-6" onClick={apply} disabled={submitting}>
            {submitting ? "Activating..." : "Activate vendor account"}
          </Button>
        </div>
      </section>
    </PageShell>
  );
};

export default BecomeVendor;
