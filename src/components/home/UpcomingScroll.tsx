import { EventCard } from "@/components/EventCard";
import type { EventCardData } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";

export const UpcomingScroll = ({ events }: { events: EventCardData[] }) => {
  const { t } = useLanguage();
  if (events.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-10">
      <h2 className="font-display font-extrabold text-2xl md:text-3xl mb-6">{t("hero.upcoming")}</h2>
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-visible">
        {events.slice(0, 8).map((e) => (
          <div key={e.id} className="min-w-[280px] max-w-[280px] md:min-w-0 md:max-w-none snap-start shrink-0 md:shrink">
            <EventCard e={e} />
          </div>
        ))}
      </div>
    </section>
  );
};
