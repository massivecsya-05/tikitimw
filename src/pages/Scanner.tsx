import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, AlertTriangle, Camera, CameraOff, Keyboard } from "lucide-react";
import { toast } from "sonner";
import { TicketQRDialog } from "@/components/TicketQRDialog";

type Result =
  | { kind: "ok"; event_title: string; tier_name: string; attendee_name: string | null }
  | { kind: "already"; event_title: string; tier_name: string; attendee_name: string | null }
  | { kind: "cancelled" }
  | { kind: "not_found" }
  | { kind: "unauthorized" }
  | { kind: "error"; message: string };

const Scanner = () => {
  const { user, roles, loading } = useAuth();
  const { t } = useLanguage();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [manual, setManual] = useState("");
  const [activeQr, setActiveQr] = useState<{ code: string; title?: string; tier?: string; checkedIn?: boolean } | null>(null);
  const [stats, setStats] = useState({ scanned: 0, valid: 0, invalid: 0 });

  const stop = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      await scannerRef.current.stop();
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      void stop();
    };
  }, []);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;
  if (!roles.includes("vendor") && !roles.includes("admin")) {
    return (
      <PageShell>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-display text-3xl mb-3">Scanner is for vendors</h1>
          <p className="text-muted-foreground">Only event organisers and admins can check in tickets.</p>
        </div>
      </PageShell>
    );
  }

  const submit = async (code: string) => {
    if (!code) return;
    const now = Date.now();
    if (lastScanRef.current && lastScanRef.current.code === code && now - lastScanRef.current.at < 3000) return;
    lastScanRef.current = { code, at: now };

    try {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(code)) {
        setResult({ kind: "not_found" });
        setStats((s) => ({ ...s, scanned: s.scanned + 1, invalid: s.invalid + 1 }));
        return;
      }
      // scan_ticket is the correct RPC \u2014 it checks the `tickets` table, which is what
      // customer QR codes now encode (tickets.id). The old check_in() RPC looked at
      // order_items.id instead and is no longer aligned with how tickets are issued.
      const { data, error } = await supabase.rpc("scan_ticket", { p_ticket_id: code });
      if (error) throw error;
      const r = data as any;
      setStats((s) => ({ ...s, scanned: s.scanned + 1 }));

      if (r.status === "used_ok") {
        setResult({ kind: "ok", event_title: r.event_title, tier_name: r.tier_name, attendee_name: r.buyer_name });
        setStats((s) => ({ ...s, valid: s.valid + 1 }));
        toast.success(`\u2713 ${r.buyer_name ?? "Guest"} \u2014 ${r.tier_name}`);
        setActiveQr({ code, title: r.event_title, tier: r.tier_name, checkedIn: true });
      } else if (r.status === "already_used") {
        setResult({ kind: "already", event_title: r.event_title, tier_name: r.tier_name, attendee_name: r.buyer_name });
        setStats((s) => ({ ...s, invalid: s.invalid + 1 }));
        setActiveQr({ code, title: r.event_title, tier: r.tier_name, checkedIn: true });
      } else if (r.status === "cancelled_ticket") {
        setResult({ kind: "cancelled" });
        setStats((s) => ({ ...s, invalid: s.invalid + 1 }));
      } else if (r.status === "unauthorized_event" || r.status === "wrong_event") {
        setResult({ kind: "unauthorized" });
        setStats((s) => ({ ...s, invalid: s.invalid + 1 }));
      } else {
        setResult({ kind: "not_found" });
        setStats((s) => ({ ...s, invalid: s.invalid + 1 }));
      }
    } catch (e: any) {
      setResult({ kind: "error", message: e.message ?? "Failed to check in" });
      setStats((s) => ({ ...s, scanned: s.scanned + 1, invalid: s.invalid + 1 }));
    }
  };

  const start = async () => {
    setResult(null);
    const scannerId = "organiser-qr-reader";
    const scanner = new Html5Qrcode(scannerId);
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 260, height: 260 } },
        (decodedText) => {
          void submit(decodedText.trim());
        },
        () => undefined,
      );
      setScanning(true);
    } catch (e: any) {
      toast.error("Camera unavailable: " + (e.message ?? "permission denied"));
    }
  };

  const card =
    result?.kind === "ok"
      ? "border-secondary bg-secondary/10"
      : result?.kind === "already"
      ? "border-accent bg-accent/10"
      : result?.kind === "not_found" || result?.kind === "unauthorized" || result?.kind === "error" || result?.kind === "cancelled"
      ? "border-destructive bg-destructive/10"
      : "border-border bg-gradient-card";

  return (
    <PageShell>
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-xs uppercase tracking-widest text-primary font-bold mb-2">Gate</div>
        <h1 className="font-display font-extrabold text-4xl md:text-5xl mb-6">Event Check-In</h1>

        <div className="rounded-2xl overflow-hidden border border-border bg-black aspect-square mb-3 relative">
          <div id="organiser-qr-reader" className="w-full h-full" />
          {!scanning && (
            <div className="absolute inset-0 grid place-items-center text-white/70">
              <Camera className="w-12 h-12" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 mb-4">
          {!scanning ? (
            <Button variant="hero" size="lg" className="w-full min-h-12" onClick={start}>
              <Camera className="w-4 h-4" /> Start Bulk Scan
            </Button>
          ) : (
            <Button variant="outline" size="lg" className="w-full min-h-12" onClick={() => void stop()}>
              <CameraOff className="w-4 h-4" /> Stop scanning
            </Button>
          )}
          <Button variant="gold" size="lg" className="w-full min-h-12" onClick={() => setShowManual((v) => !v)}>
            <Keyboard className="w-4 h-4" /> Manually Enter Code
          </Button>
        </div>

        {showManual && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(manual.trim());
              setManual("");
            }}
            className="flex gap-2 mb-4"
          >
            <Input
              placeholder="Paste ticket code\u2026"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              className="h-12"
              autoFocus
            />
            <Button type="submit" variant="outline" className="min-h-12">Check</Button>
          </form>
        )}

        <div className="rounded-2xl border border-border/60 bg-gradient-card p-4 mb-6 grid grid-cols-3 divide-x divide-border/60 text-center">
          <div>
            <div className="font-display font-extrabold text-2xl">{stats.scanned}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Scanned</div>
          </div>
          <div>
            <div className="font-display font-extrabold text-2xl text-secondary">{stats.valid}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Valid</div>
          </div>
          <div>
            <div className="font-display font-extrabold text-2xl text-destructive">{stats.invalid}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Invalid</div>
          </div>
        </div>

        {result && (
          <div className={`rounded-2xl border-2 p-6 ${card}`}>
            {result.kind === "ok" && (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-8 h-8 text-secondary shrink-0" />
                <div>
                  <div className="font-display font-extrabold text-2xl">Checked in \u2713</div>
                  <div className="font-bold mt-1">{result.attendee_name ?? "Guest"}</div>
                  <div className="text-sm text-muted-foreground">{result.event_title} \u00b7 {result.tier_name}</div>
                </div>
              </div>
            )}
            {result.kind === "already" && (
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-8 h-8 text-accent shrink-0" />
                <div>
                  <div className="font-display font-extrabold text-2xl">Already checked in</div>
                  <div className="font-bold mt-1">{result.attendee_name ?? "Guest"}</div>
                  <div className="text-sm text-muted-foreground">{result.event_title} \u00b7 {result.tier_name}</div>
                </div>
              </div>
            )}
            {result.kind === "cancelled" && (
              <div className="flex items-center gap-3">
                <XCircle className="w-8 h-8 text-destructive" />
                <div>
                  <div className="font-display font-extrabold text-xl">Ticket cancelled</div>
                  <div className="text-sm text-muted-foreground">This event was cancelled and the ticket is no longer valid.</div>
                </div>
              </div>
            )}
            {result.kind === "not_found" && (
              <div className="flex items-center gap-3">
                <XCircle className="w-8 h-8 text-destructive" />
                <div className="font-display font-extrabold text-xl">Invalid ticket</div>
              </div>
            )}
            {result.kind === "unauthorized" && (
              <div className="flex items-center gap-3">
                <XCircle className="w-8 h-8 text-destructive" />
                <div>
                  <div className="font-display font-extrabold text-xl">Not your event</div>
                  <div className="text-sm text-muted-foreground">You can only check in tickets for events you organise.</div>
                </div>
              </div>
            )}
            {result.kind === "error" && (
              <div className="flex items-center gap-3">
                <XCircle className="w-8 h-8 text-destructive" />
                <div>
                  <div className="font-display font-extrabold text-xl">Error</div>
                  <div className="text-sm text-muted-foreground">{result.message}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <TicketQRDialog
        open={!!activeQr}
        onOpenChange={(v) => !v && setActiveQr(null)}
        qrCode={activeQr?.code ?? ""}
        eventTitle={activeQr?.title}
        tierName={activeQr?.tier}
        checkedIn={activeQr?.checkedIn}
      />
    </PageShell>
  );
};

export default Scanner;
