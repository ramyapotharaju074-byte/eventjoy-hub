import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitSupport } from "@/lib/events.functions";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Help & support — EpicEventz" },
      { name: "description", content: "Answers about tickets, refunds and hosting events — or contact the EpicEventz team." },
      { property: "og:title", content: "Help & support — EpicEventz" },
      { property: "og:description", content: "Answers about tickets, refunds and hosting events — or contact the EpicEventz team." },
    ],
  }),
  component: SupportPage,
});

const faqs: [string, string][] = [
  ["Where are my tickets?", "Sign in and open My tickets. Every order is linked to your account."],
  ["How many tickets can I buy?", "Up to 10 tickets per order, as long as seats remain."],
  ["Can I leave a review?", "Yes — anyone who bought a ticket can rate the event once."],
  ["How do I host an event?", "Create an organizer account, then use the Dashboard to publish your event with price and capacity."],
];

function SupportPage() {
  const send = useServerFn(submitSupport);
  const [f, setF] = useState({ name: "", email: "", subject: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await send({ data: f });
      setDone(r.caseNumber);
    } catch (err) {
      toast.error("Couldn't send your request. Please check the fields and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-12 px-4 py-12 md:grid-cols-2">
      <div>
        <h1 className="text-4xl font-extrabold">How can we help?</h1>
        <Accordion type="single" collapsible className="mt-6">
          {faqs.map(([q, a]) => (
            <AccordionItem key={q} value={q}>
              <AccordionTrigger>{q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-2xl font-bold">Contact support</h2>
        {done ? (
          <p className="mt-4">Thanks! Your request <span className="font-bold text-accent">#{done}</span> was received. We'll reply by email.</p>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <div className="space-y-1"><Label htmlFor="sn">Name</Label><Input id="sn" required maxLength={100} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="se">Email</Label><Input id="se" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="ss">Subject</Label><Input id="ss" required minLength={3} maxLength={200} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="sm">Message</Label><Textarea id="sm" required minLength={5} maxLength={4000} rows={5} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></div>
            <Button type="submit" disabled={busy} className="w-full">{busy ? "Sending…" : "Send"}</Button>
          </form>
        )}
      </div>
    </main>
  );
}
