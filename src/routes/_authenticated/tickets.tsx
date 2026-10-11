import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { myTickets } from "@/lib/events.functions";
import { formatMoney } from "@/lib/format";

const ticketsQuery = queryOptions({ queryKey: ["tickets"], queryFn: () => myTickets() });

export const Route = createFileRoute("/_authenticated/tickets")({
  head: () => ({ meta: [{ title: "My tickets — EpicEventz" }, { name: "description", content: "Your EpicEventz ticket orders." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(ticketsQuery),
  component: TicketsPage,
});

function TicketsPage() {
  const { data } = useSuspenseQuery(ticketsQuery);
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-4xl font-extrabold">My tickets</h1>
      <div className="mt-8 space-y-4">
        {data.map((o) => (
          <Link key={o.id} to="/events/$id" params={{ id: o.campaign_id }}
            className="flex overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary">
            <div className="ticket-notch grid w-28 shrink-0 place-items-center bg-ticket font-display text-3xl font-extrabold text-primary-foreground">×{o.quantity}</div>
            <div className="flex-1 p-4">
              <p className="text-lg font-bold">{o.event_name}</p>
              <p className="text-sm text-muted-foreground">{o.buyer_name} · {new Date(o.created_at).toLocaleDateString()}</p>
              <p className="mt-1 text-xs text-muted-foreground">Order {o.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <div className="p-4 font-bold">{formatMoney(Number(o.total))}</div>
          </Link>
        ))}
        {!data.length && <p className="text-muted-foreground">No tickets yet. <Link to="/events" className="text-primary">Find an event →</Link></p>}
      </div>
    </main>
  );
}
