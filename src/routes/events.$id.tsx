import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CalendarDays, MapPin, Minus, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getEvent, purchaseTickets, submitFeedback } from "@/lib/events.functions";
import { formatDate, formatMoney } from "@/lib/format";
import { MAX_TICKETS_PER_ORDER } from "@/lib/pricing";
import { useAuth } from "@/hooks/use-auth";

const eventQuery = (id: string) => queryOptions({ queryKey: ["event", id], queryFn: () => getEvent({ data: { id } }) });

export const Route = createFileRoute("/events/$id")({
  loader: async ({ context, params }) => {
    const res = await context.queryClient.ensureQueryData(eventQuery(params.id));
    if (!res.event) throw notFound();
    return { name: res.event.name, description: res.event.description };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Event not found — EpicEventz" }, { name: "robots", content: "noindex" }] };
    const d = loaderData.description.slice(0, 155) || `Get tickets for ${loaderData.name} on EpicEventz.`;
    return {
      meta: [
        { title: `${loaderData.name} — Tickets on EpicEventz` },
        { name: "description", content: d },
        { property: "og:title", content: `${loaderData.name} — EpicEventz` },
        { property: "og:description", content: d },
      ],
    };
  },
  notFoundComponent: EventNotFound,
  component: EventPage,
});

function EventNotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Event not found</h1>
      <Link to="/events" className="mt-4 inline-block text-primary">Back to events</Link>
    </main>
  );
}

function EventPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(eventQuery(id));
  const event = data.event!;
  const { user } = useAuth();
  const qc = useQueryClient();
  const buy = useServerFn(purchaseTickets);
  const review = useServerFn(submitFeedback);
  const [qty, setQty] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  async function checkout(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await buy({ data: { eventId: id, quantity: qty, buyerName: name, buyerEmail: email || user!.email! } });
      toast.success(`You're in! ${qty} ticket(s) · ${formatMoney(r.total)}`);
      qc.invalidateQueries({ queryKey: ["event", id] });
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function sendReview(e: React.FormEvent) {
    e.preventDefault();
    try {
      await review({ data: { eventId: id, rating, comment } });
      toast.success("Thanks for your feedback!");
      setComment("");
      qc.invalidateQueries({ queryKey: ["event", id] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1fr_380px]">
      <div>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">{event.category}</span>
        <h1 className="mt-4 text-4xl font-extrabold md:text-5xl">{event.name}</h1>
        <div className="mt-4 flex flex-wrap gap-5 text-muted-foreground">
          <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />{formatDate(event.startDate)}{event.endDate && event.endDate !== event.startDate ? ` – ${formatDate(event.endDate)}` : ""}</span>
          <span className="flex items-center gap-2"><MapPin className="h-4 w-4" />{event.venue}{event.city ? `, ${event.city}` : ""}</span>
        </div>
        <p className="mt-8 whitespace-pre-line text-lg leading-relaxed">{event.description || "More details coming soon."}</p>

        <section className="mt-12">
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            Attendee feedback
            {event.rating !== null && <span className="flex items-center gap-1 text-base text-accent"><Star className="h-4 w-4 fill-accent" />{event.rating.toFixed(1)}</span>}
          </h2>
          {user && (
            <form onSubmit={sendReview} className="mt-4 space-y-3 rounded-xl border border-border bg-card p-4">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} stars`}>
                    <Star className={`h-6 w-6 ${n <= rating ? "fill-accent text-accent" : "text-muted-foreground"}`} />
                  </button>
                ))}
              </div>
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} placeholder="How was it? (ticket holders only)" />
              <Button type="submit" variant="secondary" size="sm">Post review</Button>
            </form>
          )}
          <div className="mt-6 space-y-4">
            {data.feedback.map((f) => (
              <div key={f.id} className="border-b border-border pb-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold">{f.author_name}</span>
                  <span className="flex">{Array.from({ length: f.rating }).map((_, i) => <Star key={i} className="h-3 w-3 fill-accent text-accent" />)}</span>
                </div>
                {f.comment && <p className="mt-1 text-muted-foreground">{f.comment}</p>}
              </div>
            ))}
            {!data.feedback.length && <p className="text-muted-foreground">No reviews yet.</p>}
          </div>
        </section>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-glow">
          <div className="ticket-notch bg-ticket p-6 text-primary-foreground">
            <p className="text-sm font-semibold uppercase tracking-widest">General admission</p>
            <p className="font-display text-4xl font-extrabold">{event.price === 0 ? "Free" : formatMoney(event.price)}</p>
            <p className="text-sm">{event.seatsLeft} of {event.capacity} seats left</p>
          </div>
          <div className="p-6">
            {event.seatsLeft === 0 ? (
              <p className="text-center font-semibold text-destructive">Sold out</p>
            ) : !user ? (
              <Button asChild className="w-full"><Link to="/auth">Sign in to buy tickets</Link></Button>
            ) : (
              <form onSubmit={checkout} className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Tickets</Label>
                  <div className="flex items-center gap-3">
                    <Button type="button" size="icon" variant="outline" onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="h-4 w-4" /></Button>
                    <span className="w-6 text-center font-bold">{qty}</span>
                    <Button type="button" size="icon" variant="outline" onClick={() => setQty(Math.min(MAX_TICKETS_PER_ORDER, event.seatsLeft, qty + 1))}><Plus className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div className="space-y-1"><Label htmlFor="n">Name on tickets</Label><Input id="n" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div className="space-y-1"><Label htmlFor="em">Email</Label><Input id="em" type="email" placeholder={user.email} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div className="flex justify-between border-t border-border pt-4 font-bold"><span>Total</span><span>{formatMoney(event.price * qty)}</span></div>
                <Button type="submit" className="w-full" size="lg" disabled={busy}>{busy ? "Processing…" : "Get tickets"}</Button>
              </form>
            )}
          </div>
        </div>
      </aside>
    </main>
  );
}
