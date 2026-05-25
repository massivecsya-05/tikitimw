import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageShell } from "@/components/PageShell";
import { EventCard } from "@/components/EventCard";
import { EventCardSkeleton } from "@/components/EventCardSkeleton";
import { CATEGORIES, FILTER_CITIES } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useFilteredEvents } from "@/hooks/useEvents";
import type { EventFilters } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";

const Events = () => {
  const [params, setParams] = useSearchParams();
  const { t } = useLanguage();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState(params.get("category") ?? "all");
  const [city, setCity] = useState("all");
  const [dateRange, setDateRange] = useState<EventFilters["dateRange"]>("all");
  const [priceFilter, setPriceFilter] = useState<"all" | "free" | "paid">("all");

  const filters: EventFilters = useMemo(
    () => ({
      search: q,
      category: category === "all" ? undefined : category,
      city: city === "all" ? undefined : city,
      dateRange,
      freeOnly: priceFilter === "free",
      paidOnly: priceFilter === "paid",
    }),
    [q, category, city, dateRange, priceFilter],
  );

  const { filtered, count, isLoading } = useFilteredEvents(filters);

  const setCategoryParam = (c: string) => {
    setCategory(c);
    if (c === "all") setParams({});
    else setParams({ category: c });
  };

  const chip = (active: boolean) =>
    `px-4 py-2.5 rounded-full text-sm font-medium border transition-colors min-h-12 ${
      active ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/40"
    }`;

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

        <div className="mt-6 space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Category</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button key={c.value} type="button" onClick={() => setCategoryParam(c.value)} className={chip(category === c.value)}>
                  {c.filterLabel}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">City</p>
            <div className="flex flex-wrap gap-2">
              {FILTER_CITIES.map((c) => (
                <button key={c.value} type="button" onClick={() => setCity(c.value)} className={chip(city === c.value)}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Date</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["all", "All"],
                  ["weekend", "This Weekend"],
                  ["month", "This Month"],
                  ["upcoming", "Upcoming"],
                ] as const
              ).map(([v, label]) => (
                <button key={v} type="button" onClick={() => setDateRange(v)} className={chip(dateRange === v)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Price</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["all", "All"],
                  ["free", "Free"],
                  ["paid", "Paid"],
                ] as const
              ).map(([v, label]) => (
                <button key={v} type="button" onClick={() => setPriceFilter(v)} className={chip(priceFilter === v)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
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
