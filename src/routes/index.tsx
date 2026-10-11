import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { BarChart3, MessageSquareHeart, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/EventCard";
import { listEvents } from "@/lib/events.functions";
import hero from "@/assets/hero.jpg";

export const eventsQuery = queryOptions({ queryKey: ["events"], queryFn: () => listEvents() });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EpicEventz — Every great event, one place" },
      { name: "description", content: "Discover events, buy tickets securely, and run your events with real-time sales and feedback." },
      { property: "og:title", content: "EpicEventz — Every great event, one place" },
      { property: "og:description", content: "Discover events, buy tickets securely, and run your events with real-time sales and feedback." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(eventsQuery),
  component: Home,
});

function Home() {
  const { data } = useSuspenseQuery(eventsQuery);
  const featured = data.events.slice(0, 3);
  return (
    <main>
      <section className="relative isolate overflow-hidden">
        <img src={hero} alt="Crowd at a live concert" width={1600} height={912} className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-hero-fade" />
        <div className="mx-auto max-w-6xl px-4 pb-24 pt-32 md:pt-44">
          <p className="mb-4 inline-block rounded-full border border-accent/50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-accent">Tickets · Organizers · Feedback</p>
          <h1 className="max-w-3xl text-5xl font-extrabold leading-[0.95] md:text-7xl">
            Every great event. <span className="text-primary">One stage.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Find something worth showing up for, grab tickets in seconds — or run your own event with sales and feedback in one place.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="shadow-glow"><Link to="/events">Browse events</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/auth" search={{ mode: "organizer" }}>Host an event</Link></Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="text-3xl font-bold">Coming up</h2>
          <Link to="/events" className="text-sm text-primary hover:underline">See all →</Link>
        </div>
        {data.error && <p className="text-muted-foreground">{data.error}</p>}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((e) => <EventCard key={e.id} event={e} />)}
        </div>
      </section>

      <section className="border-t border-border bg-card/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-3">
          {[
            { icon: ShieldCheck, t: "Secure checkout", d: "Tickets are tied to your account and recorded instantly." },
            { icon: BarChart3, t: "Organizer insights", d: "Revenue, sales and seat counts for every event, live." },
            { icon: MessageSquareHeart, t: "Real feedback", d: "Only ticket holders can review — so ratings mean something." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t}>
              <Icon className="mb-3 h-7 w-7 text-accent" />
              <h3 className="text-xl font-bold">{t}</h3>
              <p className="mt-2 text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
