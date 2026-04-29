import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { EventCard, EventCardData } from "@/components/EventCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, ShieldCheck, Smartphone, TrendingUp } from "lucide-react";
import hero from "@/assets/hero-festival.jpg";
import { CATEGORIES } from "@/lib/format";

const Home = () => {
  const [events, setEvents] = useState<EventCardData[]>([]);

  useEffect(() => {
    (async () => {
      const { data: ev } = await supabase
        .from("events").select("id,title,city,venue,starts_at,banner_url,category")
        .eq("status", "published").order("starts_at", { ascending: true }).limit(8);
      if (!ev) return;
      const ids = ev.map(e => e.id);
      const { data: tiers } = await supabase.from("ticket_tiers").select("event_id,price_mwk").in("event_id", ids);
      const minPrice: Record<string, number> = {};
      tiers?.forEach(t => {
        const p = Number(t.price_mwk);
        if (!(t.event_id in minPrice) || p < minPrice[t.event_id]) minPrice[t.event_id] = p;
      });
      setEvents(ev.map(e => ({ ...e, min_price: minPrice[e.id] })));
    })();
  }, []);

  return (
    <PageShell>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={hero} alt="Festival crowd at sunset in Malawi" width={1920} height={1280} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>

        <div className="container mx-auto px-4 pt-20 pb-32 lg:pt-32 lg:pb-44">
          <div className="max-w-3xl animate-fade-up">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" /> Malawi's #1 ticketing platform
            </div>
            <h1 className="font-display font-extrabold text-5xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight">
              Every <span className="text-gradient">moment</span><br/>
              starts with a <span className="text-gradient">tikiti</span>.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-xl">
              From Lake of Stars to the Kamuzu Stadium — discover Malawi's best events and book tickets in seconds with mobile money or card.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="xl"><Link to="/events">Browse events <ArrowRight className="w-5 h-5" /></Link></Button>
              <Button asChild variant="outline" size="xl"><Link to="/become-vendor">Sell tickets</Link></Button>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="container mx-auto px-4 -mt-14 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {CATEGORIES.map(c => (
            <Link key={c.value} to={`/events?category=${c.value}`}
              className="group bg-gradient-card border border-border/50 rounded-2xl p-5 text-center shadow-card hover:shadow-glow hover:-translate-y-1 transition-smooth">
              <div className="text-3xl mb-2 group-hover:scale-110 transition-smooth">{c.emoji}</div>
              <div className="font-semibold text-sm">{c.label}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* EVENTS */}
      <section className="container mx-auto px-4 mt-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-display font-extrabold text-4xl md:text-5xl">Trending now</h2>
            <p className="text-muted-foreground mt-2">Hand-picked happenings across Malawi this season</p>
          </div>
          <Button asChild variant="ghost"><Link to="/events">View all <ArrowRight className="w-4 h-4"/></Link></Button>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-20 bg-gradient-card rounded-3xl border border-dashed border-border">
            <p className="text-muted-foreground">No events published yet — be the first to <Link to="/become-vendor" className="text-primary font-semibold underline">list one</Link>.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {events.map(e => <EventCard key={e.id} e={e} />)}
          </div>
        )}
      </section>

      {/* WHY US */}
      <section className="container mx-auto px-4 mt-28">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Smartphone, title: "Pay your way", desc: "Airtel Money, TNM Mpamba, card or bank transfer — all at checkout." },
            { icon: ShieldCheck, title: "Tickets you can trust", desc: "Every ticket carries a unique QR. No duplicates, no fakes, no hassle." },
            { icon: TrendingUp, title: "Built for organizers", desc: "Real-time sales, attendee insights and instant payouts to vendors." },
          ].map((f, i) => (
            <div key={i} className="p-8 rounded-3xl bg-gradient-card border border-border/50 shadow-card">
              <div className="w-12 h-12 rounded-2xl bg-gradient-hero grid place-items-center shadow-glow mb-4">
                <f.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-display font-bold text-xl mb-2">{f.title}</h3>
              <p className="text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 mt-28">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-hero p-10 md:p-16 shadow-glow">
          <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-accent/30 blur-3xl animate-float" />
          <div className="relative max-w-2xl text-primary-foreground">
            <h2 className="font-display font-extrabold text-4xl md:text-5xl">Hosting an event in Malawi?</h2>
            <p className="mt-4 text-lg opacity-95">Reach thousands of attendees, sell out faster, and get paid the same day.</p>
            <Button asChild variant="gold" size="xl" className="mt-8"><Link to="/become-vendor">Become a vendor</Link></Button>
          </div>
        </div>
      </section>
    </PageShell>
  );
};

export default Home;
