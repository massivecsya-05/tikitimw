import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Minus, Plus } from "lucide-react";
import { formatMWK, PAYMENT_METHODS, paymentErrorMessage, type PaymentMethodValue } from "@/lib/format";
import {
  createPendingOrder,
  detectMobileNetwork,
  insertOrderItems,
  initiatePayment,
} from "@/lib/api";
import type { Database } from "@/integrations/supabase/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

type Tier = Database["public"]["Tables"]["ticket_tiers"]["Row"];
type Event = Database["public"]["Tables"]["events"]["Row"];

const STEPS = [1, 2, 3] as const;

interface CheckoutFlowProps {
  event: Event;
  tiers: Tier[];
  user: User | null;
  onClose?: () => void;
}

export const CheckoutFlow = ({ event, tiers, user }: CheckoutFlowProps) => {
  const { t } = useLanguage();
  const nav = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [name, setName] = useState(user?.user_metadata?.full_name ?? "");
  const [phone, setPhone] = useState(user?.user_metadata?.phone ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [pay, setPay] = useState<PaymentMethodValue>("airtel_money");
  const [submitting, setSubmitting] = useState(false);
  const [promptSentAt, setPromptSentAt] = useState<number | null>(null);
  const [showResend, setShowResend] = useState(false);
  const MAX_TICKETS_PER_ORDER = 4;

  const total = tiers.reduce((sum, tier) => sum + (qty[tier.id] ?? 0) * Number(tier.price_mwk), 0);
  const totalQty = Object.values(qty).reduce((a, b) => a + b, 0);

  useEffect(() => {
    const network = detectMobileNetwork(phone);
    if (network) setPay(network);
  }, [phone]);

  useEffect(() => {
    if (!promptSentAt) return;
    const tmr = setTimeout(() => setShowResend(true), 30000);
    return () => clearTimeout(tmr);
  }, [promptSentAt]);

  const setQ = (id: string, n: number, max: number) => {
    setQty((p) => {
      const currentTotalWithoutTier = Object.entries(p).reduce(
        (acc, [key, value]) => acc + (key === id ? 0 : value),
        0,
      );
      const cap = Math.max(0, Math.min(max, MAX_TICKETS_PER_ORDER - currentTotalWithoutTier));
      return { ...p, [id]: Math.max(0, Math.min(n, cap)) };
    });
  };

  const sortedMethods = [...PAYMENT_METHODS].sort((a, b) => {
    if (a.value === pay) return -1;
    if (b.value === pay) return 1;
    return 0;
  });

  const goPay = async (isResend = false) => {
    if (!user) {
      nav(`/auth?redirect=/events/${event.id}`);
      return;
    }
    if (!name.trim() || !phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    const normalizedPhone = phone.trim();
    if (!/^\+265[0-9]{7,9}$/.test(normalizedPhone)) {
      toast.error("Use a valid Malawi phone number in +265 format");
      return;
    }
    setSubmitting(true);
    try {
      const order = await createPendingOrder({
        customerId: user.id,
        totalMwk: total,
        paymentMethod: pay,
        customerEmail: email || user.email || undefined,
        customerName: name.trim(),
        customerPhone: normalizedPhone,
      });

      const items = tiers
        .filter((tier) => (qty[tier.id] ?? 0) > 0)
        .flatMap((tier) =>
          Array.from({ length: qty[tier.id] }).map(() => ({
            order_id: order.id,
            tier_id: tier.id,
            event_id: event.id,
            quantity: 1,
            unit_price_mwk: tier.price_mwk,
          })),
        );
      await insertOrderItems(items);

      const returnUrl = `${window.location.origin}/payment/callback?order_id=${order.id}`;
      const payData = await initiatePayment(order.id, email || user.email, returnUrl);
      if (payData.error) throw new Error(paymentErrorMessage(payData.error));
      if (!payData.checkout_url) throw new Error("Could not start payment. Please try again.");

      setPromptSentAt(Date.now());
      if (!isResend) toast.message(t("checkout.prompt"));
      window.location.href = payData.checkout_url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : paymentErrorMessage();
      toast.error(msg);
      setSubmitting(false);
    }
  };

  const summary = (
    <div className="rounded-2xl border border-border bg-gradient-card p-4 space-y-2 text-sm">
      <div className="font-display font-bold truncate">{event.title}</div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">{t("checkout.total")}</span>
        <span className="font-bold text-primary">{formatMWK(total)}</span>
      </div>
      <div className="text-muted-foreground">{totalQty} ticket{totalQty !== 1 ? "s" : ""}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {STEPS.map((s) => (
          <div key={s} className="flex-1">
            <div
              className={`h-1.5 rounded-full transition-colors ${step >= s ? "bg-primary" : "bg-muted"}`}
            />
            <p className={`text-[10px] mt-1 font-medium ${step === s ? "text-primary" : "text-muted-foreground"}`}>
              {s === 1 ? t("checkout.step1") : s === 2 ? t("checkout.step2") : t("checkout.step3")}
            </p>
          </div>
        ))}
      </div>

      <div className="lg:hidden">{summary}</div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {step === 1 && (
            <div className="space-y-3">
              {tiers.map((tier) => {
                const sold = Number((tier as any).quantity_sold ?? tier.sold ?? 0);
                const remaining = tier.quantity - sold;
                const current = qty[tier.id] ?? 0;
                return (
                  <div key={tier.id} className="border border-border rounded-2xl p-4">
                    <div className="flex justify-between">
                      <div>
                        <div className="font-bold">{tier.name}</div>
                        <div className="text-xs text-muted-foreground">{remaining} left</div>
                      </div>
                      <div className="font-display font-bold text-primary">{formatMWK(tier.price_mwk)}</div>
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <Button
                        size="icon"
                        variant="outline"
                        className="min-h-12 min-w-12"
                        onClick={() => setQ(tier.id, current - 1, remaining)}
                        disabled={current <= 0}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-8 text-center font-bold text-lg">{current}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="min-h-12 min-w-12"
                        onClick={() => setQ(tier.id, current + 1, remaining)}
                        disabled={current >= remaining || totalQty >= MAX_TICKETS_PER_ORDER}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              <Button
                variant="hero"
                size="lg"
                className="w-full min-h-12"
                disabled={totalQty === 0}
                onClick={() => setStep(2)}
              >
                Continue ({totalQty}/{MAX_TICKETS_PER_ORDER})
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label>Full name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required className="h-12 mt-1" />
              </div>
              <div>
                <Label>Phone number</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="h-12 mt-1"
                  inputMode="tel"
                  placeholder="+265…"
                />
              </div>
              <div>
                <Label>Email (optional)</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  className="h-12 mt-1"
                  inputMode="email"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="min-h-12" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button variant="hero" className="flex-1 min-h-12" onClick={() => setStep(3)}>
                  Continue to payment
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-xl p-4">{t("checkout.prompt")}</p>
              <RadioGroup value={pay} onValueChange={(v) => setPay(v as PaymentMethodValue)} className="gap-2">
                {sortedMethods.map((m) => (
                  <Label
                    key={m.value}
                    htmlFor={m.value}
                    className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer min-h-12 ${
                      pay === m.value ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <RadioGroupItem id={m.value} value={m.value} />
                    <div>
                      <div className="font-semibold">{m.label}</div>
                      <div className="text-xs text-muted-foreground">{m.desc}</div>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
              {showResend && (
                <Button variant="outline" className="w-full min-h-12" disabled={submitting} onClick={() => goPay(true)}>
                  {t("checkout.resend")}
                </Button>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="min-h-12" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button variant="hero" className="flex-1 min-h-12" disabled={submitting} onClick={() => goPay()}>
                  {submitting ? "Processing…" : `${t("checkout.confirm")} ${formatMWK(total)}`}
                </Button>
              </div>
            </div>
          )}
        </div>
        <div className="hidden lg:block lg:sticky lg:top-24 h-fit">{summary}</div>
      </div>

      <div className="lg:hidden fixed bottom-16 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border z-40 md:hidden">
        {step < 3 ? (
          <Button
            variant="hero"
            className="w-full min-h-12"
            disabled={step === 1 && totalQty === 0}
            onClick={() => setStep((step + 1) as 2 | 3)}
          >
            Continue · {formatMWK(total)}
          </Button>
        ) : (
          <Button variant="hero" className="w-full min-h-12" disabled={submitting} onClick={() => goPay()}>
            {t("checkout.confirm")} {formatMWK(total)}
          </Button>
        )}
      </div>
    </div>
  );
};
