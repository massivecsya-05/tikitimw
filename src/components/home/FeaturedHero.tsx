import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EventCountdown } from "@/components/EventCountdown";
import { formatDateTimeShort, formatMWK, urgencyLabel } from "@/lib/format";
import type { EventCardData } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { MapPin, Calendar, Ticket } from "lucide-react";

export const FeaturedHero = ({ event }: { event: EventCardData | null }) => {
  const { t } = useLanguage();

  if (!event) return null;

  return (
    <section className="container mx-auto px-4 pt-8 md:pt-12 pb-10">
      <div className="relative grid lg:grid-cols-[1fr_300px] rounded-3xl border border-border/50 bg-card shadow-glow overflow-hidden animate-fade-up">
        <div className="relative min-h-[380px] md:min-h-[440px] flex items-end">
          <div className="absolute inset-0 -z-10">
            {event.banner_url ? (
              <img src={event.banner_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-hero" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/10" />
          </div>

          <div className="relative p-6 md:p-10 w-full">
            <p className="text-sm font-semibold text-primary mb-2">{urgencyLabel(event.starts_at)}</p>
            <h1 className="font-display font-extrabold text-3xl md:text-5xl leading-tight max-w-xl">
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
            <div className="mt-5 lg:hidden">
              <EventCountdown startsAt={event.starts_at} />
            </div>
          </div>
        </div>

        <div className="relative lg:hidden">
          <span className="absolute -left-[9px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full bg-background" />
          <span className="absolute -right-[9px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full bg-background" />
          <div className="mx-4 border-t-2 border-dashed border-border/70" />
        </div>
        <div className="hidden lg:block relative">
          <span className="absolute left-1/2 -top-[9px] -translate-x-1/2 w-[18px] h-[18px] rounded-full bg-background" />
          <span className="absolute left-1/2 -bottom-[9px] -translate-x-1/2 w-[18px] h-[18px] rounded-full bg-background" />
          <div className="absolute left-1/2 top-4 bottom-4 -translate-x-1/2 border-l-2 border-dashed border-border/70" />
        </div>

        <div className="p-6 md:p-8 flex flex-col justify-center bg-gradient-card">
          <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Admit One</span>
          {event.min_price !== undefined && (
            <p className="mt-2 font-display font-extrabold text-3xl text-primary">
              {event.min_price === 0 ? t("event.free") : formatMWK(event.min_price)}
            </p>
          )}
          {event.min_price !== 0 && event.min_price !== undefined && (
            <span className="text-xs text-muted-foreground -mt-1">{t("event.from")}</span>
          )}
          <div className="hidden lg:block mt-4">
            <EventCountdown startsAt={event.starts_at} />
          </div>
          <Button asChild variant="hero" size="xl" className="mt-6 min-h-12 w-full">
            <Link to={`/events/${event.id}`}>
              <Ticket className="w-4 h-4" />
              {t("hero.bookNow")}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};
