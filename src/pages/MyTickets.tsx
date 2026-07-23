import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { PageShell } from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { ensureOrderTickets, fetchUserTickets, type UserTicketItem } from "@/lib/api";
import { formatDate, formatTime, formatMWK } from "@/lib/format";
import { saveTicketsOffline, type StoredTicket } from "@/lib/tickets-storage";
import { getReferralLink, whatsappShareUrl } from "@/lib/referral";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ticket, Calendar, MapPin, Share2, Copy } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

const TicketThumb = ({ ticketId }: { ticketId: string }) => {
  const [dataUrl, setDataUrl] = useState("");
  useEffect(() => {
    QRCode.toDataURL(ticketId, { width: 128, margin: 1 }).then(setDataUrl).catch(() => {});
  }, [ticketId]);
  if (!dataUrl) return <div className="w-16 h-16 rounded border border-border bg-muted animate-pulse mt-2" />;
  return <img src={dataUrl} alt="Ticket QR" className="w-16 h-16 rounded border border-border mt-2" />;
};

const MyTickets = () => {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const ensuredRef = useRef(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["my-tickets", user?.id],
    queryFn: () => fetchUserTickets(user!.id),
    enabled: !!user,
  });

  useEffect(() => {
    if (!user || isLoading || ensuredRef.current) return;
    ensuredRef.current = true;
    (async () => {
      const { data: paidOrders } = await supabase
        .from("orders")
        .select("id")
        .eq("customer_id", user.id)
        .eq("status", "paid");
      if (!paidOrders?.length) return;

      // Check against the `tickets` table (source of truth for scanning),
      // not order_items — an order is only "missing tickets" if it has none there.
      const { data: existingTickets } = await supabase
        .from("tickets" as any)
        .select("order_id")
        .in("order_id", paidOrders.map((o) => o.id));
      const withTickets = new Set((existingTickets ?? []).map((t: any) => t.order_id));
      let refreshed = false;
      for (const o of paidOrders) {
        if (withTickets.has(o.id)) continue;
        try {
          await ensureOrderTickets(o.id);
          refreshed = true;
        } catch {
          /* ignore per-order failures */
        }
      }
      if (refreshed) {
        await queryClient.invalidateQueries({ queryKey: ["my-tickets", user.id] });
      }
    })();
  }, [user, isLoading, queryClient]);

  useEffect(() => {
    if (!items.length) return;
    const stored: StoredTicket[] = items.map((it) => ({
      id: it.id,
      order_id: it.order_id,
      qr_code: it.qr_code,
      event_title: it.events?.title ?? "Event",
      venue: it.events?.venue ?? "",
      city: it.events?.city ?? "",
      starts_at: it.events?.starts_at ?? "",
      banner_url: it.events?.banner_url ?? null,
      tier_name: it.ticket_tiers?.name ?? "Ticket",
      unit_price_mwk: Number(it.unit_price_mwk),
      checked_in: it.checked_in,
      saved_at: new Date().toISOString(),
    }));
    saveTicketsOffline(stored);
  }, [items]);

  const now = Date.now();
  const { upcoming, past } = useMemo(() => {
    const up: UserTicketItem[] = [];
    const pa: UserTicketItem[] = [];
    items.forEach((it) => {
      const start = it.events?.starts_at ? new Date(it.events.starts_at).getTime() : 0;
      if (start >= now) up.push(it);
      else pa.push(it);
    });
    return { upcoming: up, past: pa };
  }, [items, now]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth?redirect=/my-tickets" />;

  const referralLink = getReferralLink(user.id);
  const shareReferral = () => {
    window.open(whatsappShareUrl(`Join me on Tikiti Malawi! Book events here: ${referralLink}`), "_blank");
  };
  const copyReferral = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied");
  };

  const TicketList = ({ list }: { list: UserTicketItem[] }) => {
    if (isLoading) {
      return (
        <div className="grid md:grid-cols-2 gap-5">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      );
    }
    if (list.length === 0) {
      return (
        <div className="text-center py-16 bg-gradient-card rounded-3xl border border-dashed border-border">
          <Ticket className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">No tickets here yet.</p>
          <Button asChild variant="hero" className="min-h-12">
            <Link to="/events">Browse events</Link>
          </Button>
        </div>
      );
    }
    return (
      <div className="grid md:grid-cols-2 gap-5">
        {list.map((it) => (
          <div key={it.id} className="overflow-hidden rounded-2xl bg-gradient-card border border-border shadow-card flex">
            <div className="w-28 shrink-0 bg-muted">
              {it.events?.banner_url ? (
                <img src={it.events.banner_url} alt="" loading="lazy" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-sunset min-h-[120px]" />
              )}
            </div>
            <div className="flex-1 p-4 flex flex-col">
              <h3 className="font-display font-bold leading-tight line-clamp-2">{it.events?.title}</h3>
              <TicketThumb ticketId={it.id} />
              <div className="text-sm text-muted-foreground mt-2 space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  {it.events && formatDate(it.events.starts_at)} · {it.events && formatTime(it.events.starts_at)}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" />
                  {it.events?.venue}, {it.events?.city}
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <span className="font-bold text-primary">{formatMWK(it.unit_price_mwk)}</span>
                <Button asChild size="sm" variant="hero" className="min-h-12">
                  <Link to={`/my-tickets/${it.id}`}>View</Link>
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <PageShell>
      <div className="container mx-auto px-4 py-12 pb-28 md:pb-12">
        <h1 className="font-display font-extrabold text-4xl md:text-5xl">{t("nav.tickets")}</h1>
        <p className="text-muted-foreground mt-2">Your digital wallet — works offline after first load.</p>

        <div className="mt-8 p-5 rounded-2xl border border-border bg-gradient-card">
          <h3 className="font-display font-bold">{t("referral.invite")}</h3>
          <p className="text-sm text-muted-foreground mt-1">Share your link — friends get great events, you earn MWK 500 off your next ticket.</p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Button variant="outline" className="min-h-12 gap-2" onClick={copyReferral}>
              <Copy className="w-4 h-4" /> {t("referral.copy")}
            </Button>
            <Button variant="hero" className="min-h-12 gap-2" onClick={shareReferral}>
              <Share2 className="w-4 h-4" /> WhatsApp
            </Button>
          </div>
        </div>

        <Tabs defaultValue="upcoming" className="mt-10">
          <TabsList className="grid w-full max-w-md grid-cols-2 h-12">
            <TabsTrigger value="upcoming" className="min-h-12">
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="past" className="min-h-12">
              Past
            </TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="mt-6">
            <TicketList list={upcoming} />
          </TabsContent>
          <TabsContent value="past" className="mt-6">
            <TicketList list={past} />
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
};

export default MyTickets;
