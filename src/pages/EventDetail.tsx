import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Clock, Share2 } from "lucide-react";
import { CATEGORIES, formatDate, formatTime, formatMWK } from "@/lib/format";
import { EventCountdown } from "@/components/EventCountdown";
import { EventImage } from "@/components/EventImage";
import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";
import { EventSEO } from "@/components/seo/EventSEO";
import { useEvent, useEventTiers } from "@/hooks/useEvent";
import { usePublishedEvents } from "@/hooks/useEvents";
import { eventWhatsAppText, whatsappShareUrl } from "@/lib/referral";
import { enrichEventsWithTiers } from "@/lib/api";

const EventDetail = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [showCheckout, setShowCheckout] = useState(false);

  const { data: event, isLoading } = useEvent(id);
  const { data: tiers = [] } = useEventTiers(id);
  const { data: allEvents } = usePublishedEvents();

  if (isLoading || !event) {
    return (
      <PageShell>
        <div className="container mx-auto px-4 py-32 text-center text-muted-foreground">Loading event…</div>
      </PageShell>
    );
  }

  const cat = CATEGORIES.find((c) => c.value === event.category);
  const enriched = allEvents?.find((e) => e.id === event.id) ?? enrichEventsWithTiers([event], tiers)[0];
  const remaining = enriched?.total_remaining ?? tiers.reduce((s, t) => s + (t.quantity - t.sold), 0);
  const minPrice = enriched?.min_price ?? (tiers.length ? Math.min(...tiers.map((t) => Number(t.price_mwk))) : undefined);

  const shareEvent = () => {
    const url = window.location.href;
    const text = eventWhatsAppText({
      title: event.title,
      date: formatDate(event.starts_at),
      venue: event.venue,
      city: event.city,
      url,
    });
    window.open(whatsappShareUrl(text), "_blank");
  };

  return (
    <PageShell>
      <EventSEO
        id={event.id}
        title={event.title}
        description={event.description}
        startsAt={event.starts_at}
        venue={event.venue}
        city={event.city}
        bannerUrl={event.banner_url}
        minPrice={minPrice}
        remaining={remaining}
      />

      <div className="relative min-h-[280px] md:min-h-[360px] overflow-hidden">
        <EventImage src={event.banner_url} alt={event.title} className="absolute inset-0 w-full h-full" aspectClass="h-full min-h-[280px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="container mx-auto px-4 relative pb-10 pt-32 md:pt-40">
          <div className="max-w-3xl">
            <span className="inline-block px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold mb-4">
              {cat?.emoji} {cat?.label}
            </span>
            <h1 className="font-display font-extrabold text-4xl md:text-6xl">{event.title}</h1>
            <div className="mt-4 flex flex-wrap gap-5 text-sm">
              <span className="flex items-center gap-2 min-h-12">
                <Calendar className="w-4 h-4 text-primary" />
                {formatDate(event.starts_at)}
              </span>
              <span className="flex items-center gap-2 min-h-12">
                <Clock className="w-4 h-4 text-primary" />
                {formatTime(event.starts_at)}
              </span>
              <span className="flex items-center gap-2 min-h-12">
                <MapPin className="w-4 h-4 text-primary" />
                {event.venue}, {event.city}
              </span>
            </div>
            <div className="mt-5">
              <EventCountdown startsAt={event.starts_at} />
            </div>
            <div className="flex flex-wrap gap-3 mt-6">
              <Button variant="hero" size="lg" className="min-h-12" onClick={() => (user ? setShowCheckout(true) : nav(`/auth?redirect=/events/${id}`))}>
                Book Now
              </Button>
              <Button variant="outline" size="lg" className="min-h-12 gap-2" onClick={shareEvent}>
                <Share2 className="w-4 h-4" /> Share on WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {showCheckout ? (
          <div>
            <Button variant="ghost" className="mb-4 min-h-12" onClick={() => setShowCheckout(false)}>
              ← Back to event
            </Button>
            <CheckoutFlow event={event} tiers={tiers} user={user} />
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2">
              <h2 className="font-display font-bold text-2xl mb-3">About this event</h2>
              <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                {event.description ?? "No description provided."}
              </p>
              {minPrice !== undefined && (
                <p className="mt-4 font-display font-bold text-xl text-primary">
                  {minPrice === 0 ? "Free entry" : `From ${formatMWK(minPrice)}`}
                </p>
              )}
            </div>
            <aside className="lg:sticky lg:top-24 h-fit">
              <div className="rounded-2xl border border-border bg-gradient-card p-4 mb-4">
                <h3 className="font-display font-bold mb-2">Available ticket tiers</h3>
                {tiers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active tiers right now.</p>
                ) : (
                  <div className="space-y-2">
                    {tiers.map((tier) => {
                      const sold = Number(tier.sold ?? 0);
                      const remainingQty = Math.max(0, tier.quantity - sold);
                      return (
                        <div key={tier.id} className="flex items-center justify-between text-sm">
                          <span className="truncate">{tier.name}</span>
                          <span className="text-muted-foreground">
                            {formatMWK(tier.price_mwk)} · {remainingQty} left
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <Button variant="hero" size="lg" className="w-full min-h-12" onClick={() => (user ? setShowCheckout(true) : nav(`/auth?redirect=/events/${id}`))}>
                Get tickets
              </Button>
              {!user && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  <Link to="/auth?mode=signup" className="text-primary font-semibold">
                    Create an account
                  </Link>
                </p>
              )}
            </aside>
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default EventDetail;
