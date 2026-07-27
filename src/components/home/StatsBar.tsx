export const StatsBar = () => {
  const stats = [
    { value: "2,400+", label: "Tickets sold" },
    { value: "50+", label: "Events hosted" },
    { value: "30+", label: "Organisers" },
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
