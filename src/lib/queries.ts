import { queryOptions } from "@tanstack/react-query";
import { listEvents, type EventItem } from "./events.functions";

export const eventsQuery = queryOptions({
  queryKey: ["events"],
  queryFn: async () => {
    try {
      return await listEvents();
    } catch (e) {
      console.error(e);
      return { events: [] as EventItem[], error: "Couldn't reach the server. Please refresh in a moment." as string | null };
    }
  },
});
