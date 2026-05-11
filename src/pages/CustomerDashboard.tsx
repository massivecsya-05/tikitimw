import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { formatDate, formatTime, formatMWK } from "@/lib/format";
import { Ticket, Calendar, MapPin, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TicketQRDialog } from "@/components/TicketQRDialog";

const CustomerDashboard = () => {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [activeTicket, setActiveTicket] = useState<any | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("order_items")
        .select("id,quantity,unit_price_mwk,qr_code,checked_in,events(title,venue,city,starts_at,banner_url),orders!inner(customer_id,status,payment_method,created_at)")
        .eq("orders.customer_id", user.id)
        .order("created_at", { ascending: false });
      setItems(data ?? []);
      setLoadingItems(false);
    })();
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;

  return (
    <PageShell>
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="font-display font-extrabold text-4xl md:text-5xl">My tickets</h1>
            <p className="text-muted-foreground mt-2">All your bookings, in one place.</p>
          </div>
          <Button asChild variant="outline"><Link to="/events">Find more events</Link></Button>
        </div>

        {loadingItems ? (
          <div className="grid md:grid-cols-2 gap-5">{[...Array(2)].map((_, i) => <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse" />)}</div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 bg-gradient-card rounded-3xl border border-dashed border-border">
            <Ticket className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">You haven't booked any tickets yet.</p>
            <Button asChild variant="hero"><Link to="/events">Browse events</Link></Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {items.map(it => (
              <div key={it.id} className="overflow-hidden rounded-2xl bg-gradient-card border border-border shadow-card flex">
                <div className="w-32 shrink-0 bg-muted">
                  {it.events?.banner_url
                    ? <img src={it.events.banner_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-gradient-sunset" />}
                </div>
                <div className="flex-1 p-5">
                  <div className="text-xs text-primary font-semibold uppercase tracking-wider mb-1">{it.orders.status}</div>
                  <h3 className="font-display font-bold text-lg leading-tight">{it.events?.title}</h3>
                  <div className="text-sm text-muted-foreground mt-2 space-y-1">
                    <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5"/>{it.events && formatDate(it.events.starts_at)} · {it.events && formatTime(it.events.starts_at)}</div>
                    <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5"/>{it.events?.venue}, {it.events?.city}</div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border gap-2">
                    <div className="font-bold text-primary">{formatMWK(it.unit_price_mwk)}</div>
                    <button
                      onClick={() => setActiveTicket(it)}
                      className="flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded-md bg-muted hover:bg-primary hover:text-primary-foreground transition-smooth cursor-pointer"
                      aria-label="View QR code"
                    >
                      <QrCode className="w-3 h-3"/>{it.qr_code.slice(0, 10)}…
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TicketQRDialog
        open={!!activeTicket}
        onOpenChange={(v) => !v && setActiveTicket(null)}
        qrCode={activeTicket?.qr_code ?? ""}
        eventTitle={activeTicket?.events?.title}
        tierName={undefined}
        startsAt={activeTicket?.events?.starts_at}
        venue={activeTicket?.events?.venue}
        city={activeTicket?.events?.city}
        checkedIn={activeTicket?.checked_in}
      />
    </PageShell>
  );
};

export default CustomerDashboard;
