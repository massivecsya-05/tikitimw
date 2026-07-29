import { Link } from "react-router-dom";
import { PageShell } from "@/components/PageShell";
import { EventCard } from "@/components/EventCard";
import { EventCardSkeleton } from "@/components/EventCardSkeleton";
import { FeaturedHero } from "@/components/home/FeaturedHero";
import { SubscribeEmpty } from "@/components/home/SubscribeEmpty";
import { HowItWorks } from "@/components/home/HowItWorks";
import { StatsBar } from "@/components/home/StatsBar";
import { FAQ } from "@/components/home/FAQ";
import { TicketDivider } from "@/components/TicketDivider";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { usePublishedEvents } from "@/hooks/useEvents";

const Home = () => {
  const { data: events = [], isLoading, isError, error } = usePublishedEvents(12);
  const featured = events[0] ?? null;
  const rest = events.slice(1);

  return (
    <PageShell>
      {isError ? (
        <section className="container mx-auto px-4 py-20 text-center">
          <p className="text-destructive font-medium">Could not load events.</p>
          <p className="text-muted-foreground text-sm mt-2">
            {(error as Error)?.message ?? "Check your connection and try again."}
          </p>
        </section>
      ) : isLoading ? (
        <div className="min-h-[420px] bg-muted animate-pulse" />
      ) : featured ? (
        <FeaturedHero event={featured} />
      ) : (
        <section className="container mx-auto px-4 py-20">
          <SubscribeEmpty />
        </section>
      )}

      <section className="container mx-auto px-4 mt-8 pb-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-display font-extrabold text-4xl md:text-5xl">Trending now</h2>
            <p className="text-muted-foreground mt-2">Hand-picked happenings across Malawi</p>
          </div>
          <Button asChild variant="ghost" className="min-h-12 hidden sm:inline-flex">
            <Link to="/events">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        ) : rest.length === 0 && !featured ? (
          <SubscribeEmpty />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(rest.length ? rest : events).map((e) => (
              <EventCard key={e.id} e={e} />
            ))}
          </div>
        )}
      </section>

      <TicketDivider />
      <HowItWorks />
      <StatsBar />
      <TicketDivider />
      <FAQ />

      <section className="container mx-auto px-4 mt-12 mb-20 md:mb-12">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-hero p-10 md:p-16 shadow-glow">
          <div className="relative max-w-2xl text-primary-foreground">
            <h2 className="font-display font-extrabold text-4xl md:text-5xl">Hosting an event in Malawi?</h2>
            <p className="mt-4 text-lg opacity-95">Reach thousands of attendees and get paid the same day.</p>
            <Button asChild variant="gold" size="xl" className="mt-8 min-h-12">
              <Link to="/become-vendor">Become a vendor</Link>
            </Button>
          </div>
        </div>
      </section>
    </PageShell>
  );
};

export default Home;


