import { Link } from "react-router-dom";
import { Calendar, MapPin } from "lucide-react";
import { CATEGORIES, formatDate, formatMWK } from "@/lib/format";

export interface EventCardData {
  id: string;
  title: string;
  city: string;
  venue: string;
  starts_at: string;
  banner_url: string | null;
  category: string;
  min_price?: number;
}

export const EventCard = ({ e }: { e: EventCardData }) => {
  const cat = CATEGORIES.find(c => c.value === e.category);
  return (
    <Link to={`/events/${e.id}`} className="group block animate-fade-up">
      <div className="relative overflow-hidden rounded-xl bg-gradient-card shadow-card hover:shadow-glow transition-smooth border border-border/50">
        <div className="aspect-[4/3] overflow-hidden bg-muted">
          {e.banner_url ? (
            <img src={e.banner_url} alt={e.title} loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-smooth" />
          ) : (
            <div className="w-full h-full bg-gradient-sunset grid place-items-center text-6xl">{cat?.emoji}</div>
          )}
          <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-background/90 backdrop-blur text-xs font-semibold">
            {cat?.emoji} {cat?.label}
          </div>
          {e.min_price !== undefined && (
            <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-gradient-gold text-accent-foreground text-xs font-bold shadow-gold">
              from {formatMWK(e.min_price)}
            </div>
          )}
        </div>
        <div className="p-3.5">
          <h3 className="font-display font-bold text-base leading-tight line-clamp-2 group-hover:text-primary transition-smooth">{e.title}</h3>
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-primary"/>{formatDate(e.starts_at)}</div>
            <div className="flex items-center gap-1.5 truncate"><MapPin className="w-3.5 h-3.5 text-primary shrink-0"/><span className="truncate">{e.venue}, {e.city}</span></div>
          </div>
        </div>
      </div>
    </Link>
  );
};
