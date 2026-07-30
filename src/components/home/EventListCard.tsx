import { Link } from "react-router-dom";
import { Calendar, MapPin, Tag } from "lucide-react";
import { EventImage } from "@/components/EventImage";
import { formatDate, formatMWK } from "@/lib/format";
import type { EventCardData } from "@/lib/api";

export const EventListCard = ({ e }: { e: EventCardData }) => (
  <Link to={`/events/${e.id}`} className="shrink-0 w-64 rounded-2xl border border-border/60 bg-card shadow-card overflow-hidden snap-start">
    <EventImage src={e.banner_url} alt={e.title} className="w-full h-32" aspectClass="h-32" />
    <div className="p-3">
      <h3 className="font-display font-bold text-sm truncate">{e.title}</h3>
      <div className="mt-1.5 space-y-1 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-primary" /> {formatDate(e.starts_at)}</div>
        <div className="flex items-center gap-1.5 truncate"><MapPin className="w-3 h-3 text-primary" /> {e.venue}, {e.city}</div>
        {e.min_price !== undefined && (
          <div className="flex items-center gap-1.5"><Tag className="w-3 h-3 text-primary" /> {e.min_price === 0 ? "Free" : formatMWK(e.min_price)}</div>
        )}
      </div>
      <span className="mt-3 block w-full text-center py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-bold">
        View Details
      </span>
    </div>
  </Link>
);
