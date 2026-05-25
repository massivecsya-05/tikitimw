import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EventCountdown } from "@/components/EventCountdown";
import { EventImage } from "@/components/EventImage";
import { formatDateTimeShort, formatMWK, urgencyLabel } from "@/lib/format";
import type { EventCardData } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { MapPin, Calendar } from "lucide-react";

export const FeaturedHero = ({ event }: { event: EventCardData | null }) => {
  const { t } = useLanguage();

  if (!event) return null;

  return (
    <section className="relative overflow-hidden min-h-[420px] md:min-h-[480px]">
      <div className="absolute inset-0 -z-10">
        {event.banner_url ? (
          <img src={event.banner_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-hero" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      <div className="container mx-auto px-4 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <div className="animate-fade-up order-2 lg:order-1">
            <p className="text-sm font-semibold text-primary mb-2">{urgencyLabel(event.starts_at)}</p>
            <h1 className="font-display font-extrabold text-4xl md:text-5xl lg:text-6xl leading-tight">
              {event.title}
            </h1>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                {formatDateTimeShort(event.starts_at)}
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                {event.venue}, {event.city}
              </span>
            </div>
            {event.min_price !== undefined && (
              <p className="mt-3 font-display font-bold text-2xl text-primary">
                {event.min_price === 0 ? t("event.free") : `${t("event.from")} ${formatMWK(event.min_price)}`}
              </p>
            )}
            <div className="mt-5">
              <EventCountdown startsAt={event.starts_at} />
            </div>
            <Button asChild variant="hero" size="xl" className="mt-8 min-h-12">
              <Link to={`/events/${event.id}`}>{t("hero.bookNow")}</Link>
            </Button>
          </div>
          <div className="order-1 lg:order-2 rounded-2xl overflow-hidden shadow-glow border border-border/50 hidden sm:block">
            <EventImage src={event.banner_url} alt={event.title} aspectClass="aspect-video" />
          </div>
        </div>
      </div>
    </section>
  );
};
