import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { PageShell } from "@/components/PageShell";
import { fetchUserTickets } from "@/lib/api";
import { getOfflineTicket } from "@/lib/tickets-storage";
import { formatDate, formatTime, formatMWK } from "@/lib/format";
import { ticketWhatsAppText, whatsappShareUrl } from "@/lib/referral";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2, Download } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

const TicketDetail = () => {
  const { id } = useParams();
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const [qrDataUrl, setQrDataUrl] = useState("");

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
    const phoneInput = window.prompt(
      "Send ticket to WhatsApp number (with country code, e.g. 265991234567). Leave blank to choose a contact.",
      (online as { orders?: { customer_phone?: string | null } } | undefined)?.orders?.customer_phone ?? "",
    );
    if (phoneInput === null) return;
    window.open(
      whatsappShareUrl(
        ticketWhatsAppText({
          title,
          date: startsAt ? `${formatDate(startsAt)} · ${formatTime(startsAt)}` : "",
          venue,
          city,
          tierName: online?.ticket_tiers?.name ?? undefined,
          ticketId: id!,
          url: window.location.href,
        }),
        phoneInput,
      ),
      "_blank",
    );
  };

  const downloadPdf = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><body style="font-family:system-ui;padding:24px;text-align:center">
      <h1>${title}</h1><p>${venue}, ${city}</p>
      <p>${startsAt ? formatDate(startsAt) : ""}</p>
      <img src="${qrDataUrl}" width="240"/><p style="font-family:monospace;font-size:12px">${qr}</p>
    </body></html>`);
    w.print();
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
              {formatDate(startsAt)} · {formatTime(startsAt)}
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
            <Button variant="outline" className="min-h-12 gap-2" onClick={downloadPdf}>
              <Download className="w-4 h-4" /> Download PDF
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default TicketDetail;
