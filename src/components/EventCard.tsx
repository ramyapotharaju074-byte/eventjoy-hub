import { Link } from "@tanstack/react-router";
import { CalendarDays, MapPin, Star } from "lucide-react";
import type { EventItem } from "@/lib/events.functions";
import { formatDate, formatMoney } from "@/lib/format";

export function EventCard({ event }: { event: EventItem }) {
  return (
    <Link
      to="/events/$id"
      params={{ id: event.id }}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-1 hover:border-primary/60 hover:shadow-glow"
    >
      <div className="relative flex h-32 items-end bg-ticket p-4">
        <span className="rounded-full bg-background/85 px-3 py-1 text-xs font-semibold">{event.category}</span>
        <span className="ml-auto font-display text-2xl font-bold text-primary-foreground">
          {event.price === 0 ? "Free" : formatMoney(event.price)}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-lg font-bold leading-tight group-hover:text-primary">{event.name}</h3>
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4" />{formatDate(event.startDate)}</p>
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{event.venue}{event.city ? `, ${event.city}` : ""}</p>
        <div className="mt-auto flex items-center justify-between pt-2 text-xs">
          <span className={event.seatsLeft === 0 ? "text-destructive" : "text-accent"}>
            {event.seatsLeft === 0 ? "Sold out" : `${event.seatsLeft} seats left`}
          </span>
          {event.rating !== null && (
            <span className="flex items-center gap-1 text-muted-foreground"><Star className="h-3 w-3 fill-accent text-accent" />{event.rating.toFixed(1)} ({event.reviews})</span>
          )}
        </div>
      </div>
    </Link>
  );
}
