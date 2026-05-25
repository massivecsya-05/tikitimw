import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Download, Check } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatTime } from "@/lib/format";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  qrCode: string;
  eventTitle?: string;
  tierName?: string;
  startsAt?: string;
  venue?: string;
  city?: string;
  checkedIn?: boolean;
}

export const TicketQRDialog = ({ open, onOpenChange, qrCode, eventTitle, tierName, startsAt, venue, city, checkedIn }: Props) => {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !qrCode) return;
    QRCode.toDataURL(qrCode, { width: 512, margin: 2, errorCorrectionLevel: "H" })
      .then(setDataUrl)
      .catch(() => toast.error("Could not render QR"));
  }, [open, qrCode]);

  const copy = async () => {
    await navigator.clipboard.writeText(qrCode);
    setCopied(true);
    toast.success("Ticket code copied");
    setTimeout(() => setCopied(false), 1800);
  };

  const download = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `ticket-${qrCode.slice(0, 8)}.png`;
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{eventTitle ?? "Your ticket"}</DialogTitle>
          {tierName && <DialogDescription>{tierName}{checkedIn && " · Already checked in"}</DialogDescription>}
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-card">
            {dataUrl ? (
              <img src={dataUrl} alt="Ticket QR code" className="w-64 h-64" />
            ) : (
              <div className="w-64 h-64 animate-pulse bg-muted rounded-lg" />
            )}
          </div>

          {(startsAt || venue) && (
            <div className="text-center text-sm text-muted-foreground">
              {startsAt && <div>{formatDate(startsAt)} · {formatTime(startsAt)}</div>}
              {venue && <div>{venue}{city ? `, ${city}` : ""}</div>}
            </div>
          )}

          <div className="w-full">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Ticket ID</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-muted rounded-lg text-xs font-mono break-all">{qrCode}</code>
              <Button size="icon" variant="outline" onClick={copy} aria-label="Copy ticket id">
                {copied ? <Check className="w-4 h-4 text-secondary" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <Button variant="hero" className="w-full" onClick={download} disabled={!dataUrl}>
            <Download className="w-4 h-4" /> Download QR
          </Button>
          <p className="text-xs text-muted-foreground text-center">Show this code at the gate for entry.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
