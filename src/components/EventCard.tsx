import { Link } from "react-router-dom";
import { Calendar, MapPin, Ticket } from "lucide-react";
import { CATEGORIES, formatDateTimeShort, formatMWK, getEventBadge } from "@/lib/format";
import type { EventCardData } from "@/lib/api";
import { EventImage } from "@/components/EventImage";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

export type { EventCardData };

const Badge = ({ type }: { type: "sold_out" | "limited" | "free" }) => {
  const styles = {
    sold_out: "bg-destructive text-destructive-foreground",
    limited: "bg-accent text-accent-foreground",
    free: "bg-secondary text-secondary-foreground",
  };
  const labels = { sold_out: "Sold Out", limited: "Limited", free: "Free" };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${styles[type]}`}>
      {labels[type]}
    </span>
  );
};

/** Perforated seam that reads as a torn ticket stub edge. */
const TicketSeam = () => (
  <div className="relative">
    <span className="absolute -left-[9px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full bg-background border border-border/50" />
    <span className="absolute -right-[9px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full bg-background border border-border/50" />
    <div className="mx-4 border-t-2 border-dashed border-border/70" />
  </div>
);

export const EventCard = ({ e }: { e: EventCardData }) => {
  const { t } = useLanguage();
  const cat = CATEGORIES.find((c) => c.value === e.category);
  const badge = getEventBadge(e);
  const soldOut = badge === "sold_out";

  return (
    <article className="group flex flex-col h-full animate-fade-up">
      <div className="relative flex flex-col h-full bg-card shadow-card rounded-2xl border border-border/50 transition-all duration-150 ease-out hover:-translate-y-1 hover:shadow-glow">
        <Link to={`/events/${e.id}`} className="block relative rounded-t-2xl overflow-hidden">
          <EventImage
            src={e.banner_url}
            alt={e.title}
            aspectClass="aspect-video"
            fallback={<span className="text-5xl">{cat?.emoji ?? "\ud83c\udfab"}</span>}
          />
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
            {badge && <Badge type={badge} />}
            <span className="px-2 py-0.5 rounded-md bg-background/90 backdrop-blur text-[10px] font-semibold">
              {cat?.emoji} {cat?.label}
            </span>
          </div>
        </Link>

        <TicketSeam />

        <div className="rounded-b-2xl overflow-hidden flex-1 flex flex-col">
          <div className="p-4 pt-3 flex flex-col flex-1">
            <Link to={`/events/${e.id}`}>
              <h3 className="font-display font-bold text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors min-h-[2.5rem]">
                {e.title}
              </h3>
            </Link>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground flex-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                {formatDateTimeShort(e.starts_at)}
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="line-clamp-1">
                  {e.venue}, {e.city}
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="font-display font-bold text-primary">
                {e.min_price !== undefined
                  ? e.min_price === 0
                    ? t("event.free")
                    : `${t("event.from")} ${formatMWK(e.min_price)}`
                  : "\u2014"}
              </span>
              <Button
                asChild
                variant="hero"
                size="sm"
                className="min-h-12 shrink-0"
                disabled={soldOut}
              >
                <Link to={`/events/${e.id}`}>
                  <Ticket className="w-4 h-4" />
                  {soldOut ? t("event.soldOut") : t("event.buyTickets")}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};
