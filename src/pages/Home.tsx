import { PageShell } from "@/components/PageShell";
import { SearchBar } from "@/components/SearchBar";
import { EventCardSkeleton } from "@/components/EventCardSkeleton";
import { FeaturedEventCard } from "@/components/home/FeaturedEventCard";
import { EventCategoryRow } from "@/components/home/EventCategoryRow";
import { SubscribeEmpty } from "@/components/home/SubscribeEmpty";
import { StatsBar } from "@/components/home/StatsBar";
import { TicketDivider } from "@/components/TicketDivider";
import { CATEGORIES } from "@/lib/format";
import { usePublishedEvents } from "@/hooks/useEvents";

const Home = () => {
  const { data: events = [], isLoading, isError, error } = usePublishedEvents(24);

  const categoriesPresent = CATEGORIES.filter((c) => events.some((e) => e.category === c.value)).slice(0, 4);
  const cityCounts: Record<string, number> = {};
  events.forEach((e) => { cityCounts[e.city] = (cityCounts[e.city] ?? 0) + 1; });
  const topCity = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  return (
    <PageShell>
      <div className="px-4 pt-4 pb-2">
        <SearchBar />
      </div>

      {isError ? (
        <section className="container mx-auto px-4 py-20 text-center">
          <p className="text-destructive font-medium">Could not load events.</p>
          <p className="text-muted-foreground text-sm mt-2">
            {(error as Error)?.message ?? "Check your connection and try again."}
          </p>
        </section>
      ) : isLoading ? (
        <div className="flex gap-3 overflow-x-auto px-4 py-2">
          {[...Array(3)].map((_, i) => <EventCardSkeleton key={i} />)}
        </div>
      ) : events.length === 0 ? (
        <section className="container mx-auto px-4 py-20">
          <SubscribeEmpty />
        </section>
      ) : (
        <>
          <section className="py-2">
            <h2 className="font-display font-bold text-xl px-4 mb-3">Featured Events</h2>
            <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory scrollbar-hide">
              {events.slice(0, 6).map((e) => <FeaturedEventCard key={e.id} e={e} />)}
            </div>
          </section>

          {topCity && (
            <EventCategoryRow title={`Upcoming near ${topCity}`} events={events.filter((e) => e.city === topCity)} />
          )}

          {categoriesPresent.map((c) => (
            <EventCategoryRow
              key={c.value}
              title={`${c.emoji} ${c.label}`}
              events={events.filter((e) => e.category === c.value)}
            />
          ))}
        </>
      )}

      <TicketDivider />
      <StatsBar />
      <div className="pb-20 md:pb-8" />
    </PageShell>
  );
};

export default Home;
