import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createEvent, organizerDashboard } from "@/lib/events.functions";
import { formatMoney } from "@/lib/format";
import { CATEGORIES } from "@/lib/pricing";
import { useAuth } from "@/hooks/use-auth";

const dashQuery = queryOptions({ queryKey: ["organizer"], queryFn: () => organizerDashboard() });

export const Route = createFileRoute("/_authenticated/organizer")({
  head: () => ({ meta: [{ title: "Organizer dashboard — EpicEventz" }, { name: "description", content: "Manage events, sales and feedback." }] }),
  component: OrganizerPage,
});

function OrganizerPage() {
  const { role, loading } = useAuth();
  const q = useQuery({ ...dashQuery, enabled: role === "organizer" });
  if (loading) return null;
  if (role !== "organizer")
    return <main className="mx-auto max-w-xl px-4 py-24 text-center"><h1 className="text-3xl font-bold">Organizer accounts only</h1><p className="mt-2 text-muted-foreground">Create an organizer account to host events.</p></main>;
  if (q.isLoading) return <main className="mx-auto max-w-6xl px-4 py-12 text-muted-foreground">Loading dashboard…</main>;
  if (q.error) return <main className="mx-auto max-w-6xl px-4 py-12 text-destructive">{(q.error as Error).message}</main>;
  const { events, orders, feedback } = q.data!;
  const revenue = orders.reduce((s, o) => s + Number(o.total), 0);
  const sold = orders.reduce((s, o) => s + o.quantity, 0);
  const avg = feedback.length ? feedback.reduce((s, f) => s + f.rating, 0) / feedback.length : null;
  const chart = events.map((e) => ({
    name: e.name.length > 14 ? e.name.slice(0, 14) + "…" : e.name,
    revenue: orders.filter((o) => o.campaign_id === e.id).reduce((s, o) => s + Number(o.total), 0),
  }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl font-extrabold">Your events</h1>
        <NewEventDialog />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        {[["Revenue", formatMoney(revenue)], ["Tickets sold", sold], ["Events", events.length], ["Avg rating", avg ? avg.toFixed(1) : "—"]].map(([l, v]) => (
          <div key={l as string} className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{l}</p>
            <p className="mt-1 font-display text-3xl font-extrabold">{v}</p>
          </div>
        ))}
      </div>

      {events.length > 0 && (
        <div className="mt-8 h-64 rounded-xl border border-border bg-card p-4">
          <ResponsiveContainer>
            <BarChart data={chart}>
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} />
              <Bar dataKey="revenue" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-8 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left text-muted-foreground">
            <tr><th className="p-3">Event</th><th className="p-3">Price</th><th className="p-3">Sold</th><th className="p-3">Seats left</th><th className="p-3">Rating</th></tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-t border-border">
                <td className="p-3 font-semibold"><Link to="/events/$id" params={{ id: e.id }} className="hover:text-primary">{e.name}</Link></td>
                <td className="p-3">{formatMoney(e.price)}</td>
                <td className="p-3">{e.sold} / {e.capacity}</td>
                <td className="p-3">{e.seatsLeft}</td>
                <td className="p-3">{e.rating ? `${e.rating.toFixed(1)} (${e.reviews})` : "—"}</td>
              </tr>
            ))}
            {!events.length && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No events yet — create your first one.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="mt-10 grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="text-2xl font-bold">Recent orders</h2>
          <div className="mt-4 space-y-2">
            {orders.slice(0, 10).map((o) => (
              <div key={o.id} className="flex justify-between rounded-lg bg-card p-3 text-sm">
                <span>{o.buyer_name} · {o.event_name} ×{o.quantity}</span><span className="font-bold">{formatMoney(Number(o.total))}</span>
              </div>
            ))}
            {!orders.length && <p className="text-muted-foreground">No orders yet.</p>}
          </div>
        </section>
        <section>
          <h2 className="text-2xl font-bold">Latest feedback</h2>
          <div className="mt-4 space-y-2">
            {feedback.slice(0, 10).map((f) => (
              <div key={f.id} className="rounded-lg bg-card p-3 text-sm">
                <span className="flex items-center gap-1 font-semibold">{f.author_name} <Star className="h-3 w-3 fill-accent text-accent" />{f.rating}</span>
                {f.comment && <p className="text-muted-foreground">{f.comment}</p>}
              </div>
            ))}
            {!feedback.length && <p className="text-muted-foreground">No feedback yet.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}

function NewEventDialog() {
  const create = useServerFn(createEvent);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ name: "", description: "", startDate: "", endDate: "", venue: "", city: "", category: "Conference", price: "49", capacity: "200" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await create({ data: { ...f, endDate: f.endDate || f.startDate, price: Number(f.price), capacity: Number(f.capacity) } });
      toast.success("Event published");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["organizer"] });
      qc.invalidateQueries({ queryKey: ["events"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4" />New event</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create an event</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1"><Label>Name</Label><Input required minLength={3} maxLength={80} value={f.name} onChange={set("name")} /></div>
          <div className="space-y-1"><Label>Description</Label><Textarea maxLength={2000} value={f.description} onChange={set("description")} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Start</Label><Input type="date" required value={f.startDate} onChange={set("startDate")} /></div>
            <div className="space-y-1"><Label>End</Label><Input type="date" value={f.endDate} onChange={set("endDate")} /></div>
            <div className="space-y-1"><Label>Venue</Label><Input required value={f.venue} onChange={set("venue")} /></div>
            <div className="space-y-1"><Label>City</Label><Input value={f.city} onChange={set("city")} /></div>
            <div className="space-y-1"><Label>Ticket price ($)</Label><Input type="number" min={0} step="0.01" required value={f.price} onChange={set("price")} /></div>
            <div className="space-y-1"><Label>Capacity</Label><Input type="number" min={1} required value={f.capacity} onChange={set("capacity")} /></div>
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <select value={f.category} onChange={set("category")} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Publishing…" : "Publish event"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
