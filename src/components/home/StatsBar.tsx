import { useHomeStats } from "@/hooks/useEvents";

export const StatsBar = () => {
  const { data, isLoading } = useHomeStats();

  const stats = [
    { value: isLoading ? "\u2014" : `${(data?.ticketsSold ?? 0).toLocaleString()}+`, label: "Tickets sold" },
    { value: isLoading ? "\u2014" : `${data?.eventsHosted ?? 0}+`, label: "Events hosted" },
    { value: isLoading ? "\u2014" : `${data?.organisers ?? 0}+`, label: "Organisers" },
  ];

  return (
    <section className="bg-gradient-hero text-primary-foreground py-12">
      <div className="container mx-auto px-4 grid grid-cols-3 gap-6 text-center">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="font-display font-extrabold text-3xl md:text-4xl">{s.value}</div>
            <div className="text-sm opacity-90 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
};
