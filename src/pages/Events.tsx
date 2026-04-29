import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { EventCard, EventCardData } from "@/components/EventCard";
import { CATEGORIES } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const Events = () => {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") ?? "all";
  const [q, setQ] = useState("");
  const [events, setEvents] = useState<EventCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let query = supabase.from("events")
        .select("id,title,city,venue,starts_at,banner_url,category")
        .eq("status", "published").order("starts_at", { ascending: true });
      if (category !== "all") query = query.eq("category", category as any);
      const { data: ev } = await query;
      if (!ev) { setEvents([]); setLoading(false); return; }
      const ids = ev.map(e => e.id);
      const { data: tiers } = await supabase.from("ticket_tiers").select("event_id,price_mwk").in("event_id", ids);
      const minPrice: Record<string, number> = {};
      tiers?.forEach(t => {
        const p = Number(t.price_mwk);
        if (!(t.event_id in minPrice) || p < minPrice[t.event_id]) minPrice[t.event_id] = p;
      });
      setEvents(ev.map(e => ({ ...e, min_price: minPrice[e.id] })));
      setLoading(false);
    })();
  }, [category]);

  const filtered = events.filter(e =>
    !q || e.title.toLowerCase().includes(q.toLowerCase()) || e.city.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <PageShell>
      <section className="container mx-auto px-4 py-12">
        <h1 className="font-display font-extrabold text-5xl md:text-6xl">Discover events</h1>
        <p className="text-muted-foreground mt-2 text-lg">All things happening across Malawi.</p>

        <div className="mt-8 relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by title or city..."
            className="pl-12 h-12 rounded-xl text-base" />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button onClick={() => setParams({})}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-smooth ${category === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/40"}`}>All</button>
          {CATEGORIES.map(c => (
            <button key={c.value} onClick={() => setParams({ category: c.value })}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-smooth ${category === c.value ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/40"}`}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        <div className="mt-10">
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => <div key={i} className="aspect-[4/5] rounded-2xl bg-muted animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-gradient-card rounded-3xl border border-dashed border-border">
              <p className="text-muted-foreground">No events match your filters yet.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filtered.map(e => <EventCard key={e.id} e={e} />)}
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
};

export default Events;
