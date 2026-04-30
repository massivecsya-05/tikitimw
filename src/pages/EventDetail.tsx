import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Clock, Minus, Plus, Ticket } from "lucide-react";
import { CATEGORIES, formatDate, formatTime, formatMWK, PAYMENT_METHODS } from "@/lib/format";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const EventDetail = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [tiers, setTiers] = useState<any[]>([]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [pay, setPay] = useState<string>("airtel_money");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data: ev } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
      setEvent(ev);
      const { data: ts } = await supabase.from("ticket_tiers").select("*").eq("event_id", id).order("price_mwk");
      setTiers(ts ?? []);
    })();
  }, [id]);

  if (!event) return <PageShell><div className="container mx-auto px-4 py-32 text-center text-muted-foreground">Loading event...</div></PageShell>;

  const cat = CATEGORIES.find(c => c.value === event.category);
  const total = tiers.reduce((sum, t) => sum + (qty[t.id] ?? 0) * Number(t.price_mwk), 0);
  const totalQty = Object.values(qty).reduce((a, b) => a + b, 0);

  const setQ = (id: string, n: number, max: number) => {
    const v = Math.max(0, Math.min(n, max));
    setQty(p => ({ ...p, [id]: v }));
  };

  const checkout = async () => {
    if (!user) { nav("/auth?redirect=/events/" + id); return; }
    if (totalQty === 0) return toast.error("Select at least one ticket");
    setCheckoutOpen(true);
  };

  const confirm = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      // 1. Create a PENDING order + items (status defaults to 'pending')
      const { data: order, error } = await supabase.from("orders").insert({
        customer_id: user.id, total_mwk: total, status: "pending", payment_method: pay as any,
      }).select().single();
      if (error || !order) throw error;

      const items = tiers.filter(t => (qty[t.id] ?? 0) > 0).flatMap(t =>
        Array.from({ length: qty[t.id] }).map(() => ({
          order_id: order.id, tier_id: t.id, event_id: event.id, quantity: 1, unit_price_mwk: t.price_mwk,
        }))
      );
      const { error: e2 } = await supabase.from("order_items").insert(items);
      if (e2) throw e2;

      // 2. Initiate PayChangu sandbox session and redirect
      const returnUrl = `${window.location.origin}/payment/callback?order_id=${order.id}`;
      const { data: payRes, error: payErr } = await supabase.functions.invoke("initiate-payment", {
        body: {
          order_id: order.id,
          customer_email: user.email,
          return_url: returnUrl,
        },
      });
      if (payErr) throw payErr;
      const payData = payRes as { checkout_url?: string };
      if (!payData?.checkout_url) throw new Error("No checkout URL returned");

      window.location.href = payData.checkout_url;
    } catch (e: any) {
      toast.error(e.message ?? "Checkout failed");
      setSubmitting(false);
    }
  };

  return (
    <PageShell>
      {/* HERO */}
      <div className="relative h-[55vh] min-h-[420px] overflow-hidden">
        {event.banner_url ? (
          <img src={event.banner_url} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-sunset" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="container mx-auto px-4 h-full flex items-end pb-10 relative">
          <div className="max-w-3xl animate-fade-up">
            <div className="inline-block px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold mb-4">
              {cat?.emoji} {cat?.label}
            </div>
            <h1 className="font-display font-extrabold text-4xl md:text-6xl">{event.title}</h1>
            <div className="mt-4 flex flex-wrap gap-5 text-sm">
              <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-primary"/>{formatDate(event.starts_at)}</span>
              <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary"/>{formatTime(event.starts_at)}</span>
              <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary"/>{event.venue}, {event.city}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          <h2 className="font-display font-bold text-2xl mb-3">About this event</h2>
          <p className="text-muted-foreground whitespace-pre-line leading-relaxed">{event.description ?? "No description provided."}</p>
        </div>

        <aside className="lg:sticky lg:top-24 h-fit">
          <div className="bg-gradient-card border border-border rounded-3xl p-6 shadow-card">
            <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2"><Ticket className="w-5 h-5 text-primary"/>Get tickets</h3>
            <div className="space-y-3">
              {tiers.length === 0 && <p className="text-sm text-muted-foreground">No tickets available.</p>}
              {tiers.map(t => {
                const remaining = t.quantity - t.sold;
                const current = qty[t.id] ?? 0;
                return (
                  <div key={t.id} className="border border-border rounded-2xl p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold">{t.name}</div>
                        {t.description && <div className="text-xs text-muted-foreground">{t.description}</div>}
                        <div className="text-xs text-muted-foreground mt-1">{remaining} left</div>
                      </div>
                      <div className="font-display font-bold text-lg text-primary">{formatMWK(t.price_mwk)}</div>
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <Button size="icon" variant="outline" onClick={() => setQ(t.id, current - 1, remaining)} disabled={current <= 0}><Minus className="w-4 h-4"/></Button>
                      <span className="w-8 text-center font-bold">{current}</span>
                      <Button size="icon" variant="outline" onClick={() => setQ(t.id, current + 1, remaining)} disabled={current >= remaining}><Plus className="w-4 h-4"/></Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-border mt-5 pt-5 flex justify-between font-bold">
              <span>Total</span><span className="text-primary text-xl font-display">{formatMWK(total)}</span>
            </div>
            <Button variant="hero" size="lg" className="w-full mt-4" onClick={checkout} disabled={totalQty === 0}>
              {user ? "Checkout" : "Sign in to checkout"}
            </Button>
            {!user && <p className="text-xs text-muted-foreground text-center mt-2">New here? <Link to="/auth?mode=signup" className="text-primary font-semibold">Create an account</Link></p>}
          </div>
        </aside>
      </div>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Choose payment method</DialogTitle>
            <DialogDescription>Total to pay: <strong className="text-foreground">{formatMWK(total)}</strong></DialogDescription>
          </DialogHeader>
          <RadioGroup value={pay} onValueChange={setPay} className="gap-2">
            {PAYMENT_METHODS.map(m => (
              <Label key={m.value} htmlFor={m.value}
                className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-smooth ${pay === m.value ? "border-primary bg-primary/5" : "border-border"}`}>
                <RadioGroupItem id={m.value} value={m.value} />
                <div className="flex-1">
                  <div className="font-semibold">{m.label}</div>
                  <div className="text-xs text-muted-foreground">{m.desc}</div>
                </div>
              </Label>
            ))}
          </RadioGroup>
          <Button variant="hero" size="lg" onClick={confirm} disabled={submitting}>
            {submitting ? "Processing..." : `Pay ${formatMWK(total)}`}
          </Button>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

export default EventDetail;
