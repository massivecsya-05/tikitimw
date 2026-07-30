import { Link } from "react-router-dom";
import { Calendar, MapPin } from "lucide-react";
import { EventImage } from "@/components/EventImage";
import { formatDate, formatMWK } from "@/lib/format";
import type { EventCardData } from "@/lib/api";

export const FeaturedEventCard = ({ e }: { e: EventCardData }) => (
  <Link
    to={`/events/${e.id}`}
    className="relative shrink-0 w-72 h-44 rounded-2xl overflow-hidden shadow-card snap-start"
  >
    <EventImage src={e.banner_url} alt={e.title} className="absolute inset-0 w-full h-full" aspectClass="h-full" />
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
    <div className="absolute inset-x-0 bottom-0 p-3 text-white">
      <h3 className="font-display font-bold text-sm truncate">{e.title}</h3>
      <div className="flex items-center gap-1.5 text-[11px] opacity-90 mt-0.5">
        <Calendar className="w-3 h-3" /> {formatDate(e.starts_at)}
      </div>
      <span className="inline-block mt-2 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
        {e.min_price ? `From ${formatMWK(e.min_price)}` : "Buy Tickets"}
      </span>
    </div>
  </Link>
);
