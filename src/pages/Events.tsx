import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { EventCard } from "@/components/EventCard";
import { EventCardSkeleton } from "@/components/EventCardSkeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useFilteredEvents } from "@/hooks/useEvents";
import { useLanguage } from "@/contexts/LanguageContext";

const Events = () => {
  const { t } = useLanguage();
  const [q, setQ] = useState("");

  const { filtered, count, isLoading } = useFilteredEvents({ search: q });

  return (
    <PageShell>
      <section className="container mx-auto px-4 py-12 pb-24 md:pb-12">
        <h1 className="font-display font-extrabold text-5xl md:text-6xl">Discover events</h1>
        <p className="text-muted-foreground mt-2 text-lg">All things happening across Malawi.</p>

        <div className="mt-8 relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("events.search")}
            className="pl-12 h-12 rounded-xl text-base"
            list="event-suggestions"
          />
          <datalist id="event-suggestions">
            {filtered.slice(0, 8).map((e) => (
              <option key={e.id} value={e.title} />
            ))}
          </datalist>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          {t("events.showing")} <strong className="text-foreground">{count}</strong> events
        </p>

        <div className="mt-8">
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <EventCardSkeleton key={i} />
              ))}
            </div>
          ) : count === 0 ? (
            <div className="text-center py-20 bg-gradient-card rounded-3xl border border-dashed border-border">
              <p className="text-muted-foreground">{t("events.empty")}</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filtered.map((e) => (
                <EventCard key={e.id} e={e} />
              ))}
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
};

export default Events;