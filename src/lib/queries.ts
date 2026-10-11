import { queryOptions } from "@tanstack/react-query";
import { listEvents } from "./events.functions";

export const eventsQuery = queryOptions({ queryKey: ["events"], queryFn: () => listEvents() });
