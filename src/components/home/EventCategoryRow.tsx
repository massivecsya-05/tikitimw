import { EventListCard } from "@/components/home/EventListCard";
import type { EventCardData } from "@/lib/api";

export const EventCategoryRow = ({ title, events }: { title: string; events: EventCardData[] }) => {
  if (events.length === 0) return null;
  return (
    <section className="py-2">
      <h2 className="font-display font-bold text-xl px-4 mb-3">{title}</h2>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory scrollbar-hide">
        {events.map((e) => (
          <EventListCard key={e.id} e={e} />
        ))}
      </div>
    </section>
  );
};
