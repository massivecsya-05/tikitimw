import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, AlertTriangle, Camera, CameraOff } from "lucide-react";
import { toast } from "sonner";
import { TicketQRDialog } from "@/components/TicketQRDialog";

type Result =
  | { kind: "ok"; event_title: string; tier_name: string; attendee_name: string | null }
  | { kind: "already"; event_title: string; tier_name: string; attendee_name: string | null; checked_in_at: string }
  | { kind: "not_found" }
  | { kind: "unauthorized" }
  | { kind: "error"; message: string };

const Scanner = () => {
  const { user, roles, loading } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [manual, setManual] = useState("");
  const [activeQr, setActiveQr] = useState<{ code: string; title?: string; tier?: string; checkedIn?: boolean } | null>(null);

  const stop = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  };

  useEffect(() => () => stop(), []);

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
    // Debounce duplicate scans within 3s
    const now = Date.now();
    if (lastScanRef.current && lastScanRef.current.code === code && now - lastScanRef.current.at < 3000) return;
    lastScanRef.current = { code, at: now };

    try {
      // Look up the order_item by qr_code, then call check_in RPC
      const { data: items, error: lookupErr } = await supabase
        .from("order_items")
        .select("id")
        .eq("qr_code", code)
        .limit(1);
      if (lookupErr) throw lookupErr;
      if (!items || items.length === 0) {
        setResult({ kind: "not_found" });
        return;
      }
      const { data, error } = await supabase.rpc("check_in", { p_order_item_id: items[0].id });
      if (error) throw error;
      const r = data as any;
      if (r.status === "checked_in") {
        setResult({ kind: "ok", event_title: r.event_title, tier_name: r.tier_name, attendee_name: r.attendee_name });
        toast.success(`✓ ${r.attendee_name ?? "Guest"} — ${r.tier_name}`);
        setActiveQr({ code, title: r.event_title, tier: r.tier_name, checkedIn: true });
      } else if (r.status === "already_checked_in") {
        setResult({
          kind: "already",
          event_title: r.event_title,
          tier_name: r.tier_name,
          attendee_name: r.attendee_name,
          checked_in_at: r.checked_in_at,
        });
        setActiveQr({ code, title: r.event_title, tier: r.tier_name, checkedIn: true });
      } else if (r.status === "unauthorized") {
        setResult({ kind: "unauthorized" });
      } else {
        setResult({ kind: "not_found" });
      }
    } catch (e: any) {
      setResult({ kind: "error", message: e.message ?? "Failed to check in" });
    }
  };

  const start = async () => {
    if (!videoRef.current) return;
    setResult(null);
    const reader = new BrowserMultiFormatReader();
    try {
      const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (res) => {
        if (res) {
          submit(res.getText().trim());
        }
      });
      controlsRef.current = controls;
      setScanning(true);
    } catch (e: any) {
      toast.error("Camera unavailable: " + (e.message ?? "permission denied"));
    }
  };

  const card =
    result?.kind === "ok"
      ? "border-secondary bg-secondary/10"
      : result?.kind === "already"
      ? "border-yellow-500 bg-yellow-500/10"
      : result?.kind === "not_found" || result?.kind === "unauthorized" || result?.kind === "error"
      ? "border-destructive bg-destructive/10"
      : "border-border bg-gradient-card";

  return (
    <PageShell>
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-xs uppercase tracking-widest text-primary font-bold mb-2">Gate</div>
        <h1 className="font-display font-extrabold text-4xl md:text-5xl mb-6">Ticket scanner</h1>

        <div className="rounded-2xl overflow-hidden border border-border bg-black aspect-square mb-3 relative">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          {!scanning && (
            <div className="absolute inset-0 grid place-items-center text-white/70">
              <Camera className="w-12 h-12" />
            </div>
          )}
        </div>

        <div className="flex gap-2 mb-6">
          {!scanning ? (
            <Button variant="hero" size="lg" className="flex-1" onClick={start}>
              <Camera /> Start scanning
            </Button>
          ) : (
            <Button variant="outline" size="lg" className="flex-1" onClick={stop}>
              <CameraOff /> Stop
            </Button>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(manual.trim());
            setManual("");
          }}
          className="flex gap-2 mb-6"
        >
          <Input
            placeholder="Or paste ticket code…"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
          />
          <Button type="submit" variant="outline">Check</Button>
        </form>

        {result && (
          <div className={`rounded-2xl border-2 p-6 ${card}`}>
            {result.kind === "ok" && (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-8 h-8 text-secondary shrink-0" />
                <div>
                  <div className="font-display font-extrabold text-2xl">Checked in ✓</div>
                  <div className="font-bold mt-1">{result.attendee_name ?? "Guest"}</div>
                  <div className="text-sm text-muted-foreground">{result.event_title} · {result.tier_name}</div>
                </div>
              </div>
            )}
            {result.kind === "already" && (
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-8 h-8 text-yellow-600 shrink-0" />
                <div>
                  <div className="font-display font-extrabold text-2xl">Already checked in</div>
                  <div className="font-bold mt-1">{result.attendee_name ?? "Guest"}</div>
                  <div className="text-sm text-muted-foreground">{result.event_title} · {result.tier_name}</div>
                  <div className="text-xs text-muted-foreground mt-1">at {new Date(result.checked_in_at).toLocaleString()}</div>
                </div>
              </div>
            )}
            {result.kind === "not_found" && (
              <div className="flex items-center gap-3">
                <XCircle className="w-8 h-8 text-destructive" />
                <div className="font-display font-extrabold text-xl">Ticket not found</div>
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
