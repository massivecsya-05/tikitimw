import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { PageShell } from "@/components/PageShell";
import { fetchUserTickets } from "@/lib/api";
import { getOfflineTicket } from "@/lib/tickets-storage";
import { formatDate, formatTime, formatMWK } from "@/lib/format";
import { eventWhatsAppText, whatsappShareUrl } from "@/lib/referral";
import { APP_URL } from "@/lib/env";
import { openExternal } from "@/lib/nativeLinks";
import { generateTicketPdfBase64 } from "@/lib/ticketPdf";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2, Download } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { toast } from "sonner";

const TicketDetail = () => {
  const { id } = useParams();
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [downloading, setDownloading] = useState(false);

  const { data: items } = useQuery({
    queryKey: ["my-tickets", user?.id],
    queryFn: () => fetchUserTickets(user!.id),
    enabled: !!user,
  });

  const online = items?.find((it) => it.id === id);
  const offline = id ? getOfflineTicket(id) : undefined;

  const qr = online?.qr_code ?? offline?.qr_code ?? "";
  const title = online?.events?.title ?? offline?.event_title ?? "Event";
  const startsAt = online?.events?.starts_at ?? offline?.starts_at;
  const venue = online?.events?.venue ?? offline?.venue ?? "";
  const city = online?.events?.city ?? offline?.city ?? "";
  const price = online ? Number(online.unit_price_mwk) : offline?.unit_price_mwk ?? 0;

  useEffect(() => {
    if (!qr) return;
    if (qr.startsWith("data:image")) {
      setQrDataUrl(qr);
      return;
    }
    QRCode.toDataURL(qr, { width: 280, margin: 2 }).then(setQrDataUrl);
  }, [qr]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth?redirect=/my-tickets" />;
  if (!online && !offline) {
    return (
      <PageShell>
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground">Ticket not found.</p>
          <Button asChild variant="hero" className="mt-4 min-h-12">
            <Link to="/my-tickets">Back to tickets</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const shareWa = () => {
    const url = `${APP_URL}/my-tickets/${id}`;
    openExternal(
      whatsappShareUrl(
        eventWhatsAppText({
          title,
          date: startsAt ? formatDate(startsAt) : "",
          venue,
          city,
          url,
        }),
      ),
    );
  };

  const downloadPdf = async () => {
    if (!qrDataUrl) return;
    setDownloading(true);
    try {
      const base64 = generateTicketPdfBase64({
        title,
        venue,
        city,
        dateLabel: startsAt ? `${formatDate(startsAt)} \u00b7 ${formatTime(startsAt)}` : "",
        qrDataUrl,
        qrCode: qr,
      });
      const fileName = `TikitiMW-${(id ?? "ticket").slice(0, 8)}.pdf`;

      if (Capacitor.isNativePlatform()) {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Cache,
        });
        await Share.share({
          title,
          url: result.uri,
          dialogTitle: "Save or share your ticket",
        });
      } else {
        const link = document.createElement("a");
        link.href = `data:application/pdf;base64,${base64}`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (e) {
      toast.error("Could not prepare the ticket file. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <PageShell>
      <div className="container mx-auto px-4 py-10 max-w-lg pb-28 md:pb-10">
        <Link to="/my-tickets" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6 min-h-12">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="rounded-3xl border border-border bg-gradient-card p-6 text-center shadow-card">
          <h1 className="font-display font-bold text-2xl">{title}</h1>
          {startsAt && (
            <p className="text-sm text-muted-foreground mt-2">
              {formatDate(startsAt)} \u00b7 {formatTime(startsAt)}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {venue}, {city}
          </p>
          <p className="font-bold text-primary mt-2">{formatMWK(price)}</p>
          {qrDataUrl && <img src={qrDataUrl} alt="Ticket QR" className="mx-auto mt-6 rounded-xl border" width={280} height={280} />}
          <p className="font-mono text-xs text-muted-foreground mt-3 break-all">{qr}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
            <Button variant="hero" className="min-h-12 gap-2" onClick={shareWa}>
              <Share2 className="w-4 h-4" /> {t("confirm.share")}
            </Button>
            <Button variant="outline" className="min-h-12 gap-2" onClick={downloadPdf} disabled={downloading || !qrDataUrl}>
              <Download className="w-4 h-4" /> {downloading ? "Preparing\u2026" : "Download PDF"}
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default TicketDetail;
