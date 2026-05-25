import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, AlertTriangle, Share2 } from "lucide-react";
import { paymentErrorMessage } from "@/lib/format";
import { clearPendingReferral, getPendingReferral, grantReferralReward, whatsappShareUrl } from "@/lib/referral";
import { useLanguage } from "@/contexts/LanguageContext";
import QRCode from "qrcode";

type Status = "checking" | "paid" | "pending" | "failed";

const PaymentCallback = () => {
  const [params] = useSearchParams();
  const orderId = params.get("order_id");
  const failCode = params.get("error");
  const [status, setStatus] = useState<Status>(failCode ? "failed" : "checking");
  const [tries, setTries] = useState(0);
  const [qrUrl, setQrUrl] = useState("");
  const { t } = useLanguage();

  const { data: items } = useQuery({
    queryKey: ["order-items", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("id,qr_code,events(title,venue,city,starts_at)")
        .eq("order_id", orderId!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: status === "paid" && !!orderId,
  });

  useEffect(() => {
    if (!orderId) {
      setStatus("failed");
      return;
    }
    if (failCode) return;

    let cancelled = false;
    const poll = async () => {
      const { data, error } = await supabase.from("orders").select("status").eq("id", orderId).maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setStatus("failed");
        return;
      }
      if (data.status === "paid") {
        setStatus("paid");
        const ref = getPendingReferral();
        if (ref) {
          grantReferralReward(ref);
          clearPendingReferral();
        }
        return;
      }
      if (data.status === "failed" || data.status === "refunded") {
        setStatus("failed");
        return;
      }
      try {
        const { data: v } = await supabase.functions.invoke("verify-payment", { body: { order_id: orderId } });
        if (!cancelled && (v as { ok?: boolean })?.ok) {
          setStatus("paid");
          return;
        }
      } catch {
        /* keep polling */
      }
      if (tries >= 10) {
        setStatus("pending");
        return;
      }
      setTimeout(() => setTries((t) => t + 1), 2500);
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [orderId, tries, failCode]);

  useEffect(() => {
    const code = items?.[0]?.qr_code;
    if (code) QRCode.toDataURL(code, { width: 240 }).then(setQrUrl);
  }, [items]);

  const first = items?.[0];
  const ev = first?.events;

  return (
    <PageShell hideFooter>
      <div className="container mx-auto px-4 py-16 max-w-lg text-center min-h-[70vh] flex flex-col items-center justify-center">
        {status === "checking" && (
          <>
            <Loader2 className="w-14 h-14 text-primary animate-spin mb-4" />
            <h1 className="font-display font-bold text-3xl">Confirming payment…</h1>
          </>
        )}
        {status === "paid" && (
          <div className="w-full animate-fade-up">
            <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-500 mb-4" />
            <h1 className="font-display font-extrabold text-3xl">{t("confirm.title")}</h1>
            {ev && <p className="text-muted-foreground mt-2">{ev.title}</p>}
            {qrUrl && <img src={qrUrl} alt="Your ticket QR" className="mx-auto mt-6 rounded-xl border border-border" />}
            <div className="grid gap-3 mt-8">
              <Button asChild variant="hero" size="lg" className="min-h-12 w-full">
                <Link to="/my-tickets">View my tickets</Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="min-h-12 w-full gap-2"
                onClick={() =>
                  window.open(whatsappShareUrl(`I just got my Tikiti ticket for ${ev?.title ?? "an event"}!`), "_blank")
                }
              >
                <Share2 className="w-4 h-4" /> {t("confirm.share")}
              </Button>
            </div>
          </div>
        )}
        {status === "pending" && (
          <>
            <Loader2 className="w-14 h-14 text-amber-500 mb-4" />
            <h1 className="font-display font-bold text-3xl">Still processing</h1>
            <Button asChild variant="outline" size="lg" className="mt-6 min-h-12">
              <Link to="/my-tickets">My tickets</Link>
            </Button>
          </>
        )}
        {status === "failed" && (
          <>
            <AlertTriangle className="w-14 h-14 text-destructive mb-4" />
            <h1 className="font-display font-bold text-3xl">Payment not completed</h1>
            <p className="text-muted-foreground mt-2">{paymentErrorMessage(failCode ?? undefined)}</p>
            <Button asChild variant="hero" size="lg" className="mt-6 min-h-12">
              <Link to="/events">Browse events</Link>
            </Button>
          </>
        )}
      </div>
    </PageShell>
  );
};

export default PaymentCallback;
