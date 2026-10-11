import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EventCard } from "@/components/EventCard";
import { eventsQuery } from "@/lib/queries";

export const Route = createFileRoute("/events/")({
  head: () => ({
    meta: [
      { title: "Browse events — EpicEventz" },
      { name: "description", content: "Search conferences, concerts, workshops and festivals and buy tickets on EpicEventz." },
      { property: "og:title", content: "Browse events — EpicEventz" },
      { property: "og:description", content: "Search conferences, concerts, workshops and festivals and buy tickets on EpicEventz." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(eventsQuery),
  component: EventsPage,
});

function EventsPage() {
  const { data } = useSuspenseQuery(eventsQuery);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const cats = ["All", ...Array.from(new Set(data.events.map((e) => e.category)))];
  const list = useMemo(
    () =>
      data.events.filter(
        (e) =>
          (cat === "All" || e.category === cat) &&
          `${e.name} ${e.city} ${e.venue} ${e.description}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [data.events, q, cat],
  );
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-4xl font-extrabold">Find your next event</h1>
      <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative md:w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or city" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className={`rounded-full border px-3 py-1 text-sm transition ${cat === c ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>
      {data.error && <p className="mt-8 text-muted-foreground">{data.error}</p>}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((e) => <EventCard key={e.id} event={e} />)}
      </div>
      {!list.length && !data.error && <p className="mt-8 text-muted-foreground">No events match your search.</p>}
    </main>
  );
}
