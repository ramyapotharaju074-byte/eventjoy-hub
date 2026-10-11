import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { sfCreate, sfQuery, SF_ID, soqlString } from "./salesforce.server";
import { DEFAULT_CAPACITY, DEFAULT_PRICE, orderTotal, seatsLeft } from "./pricing";

export type EventItem = {
  id: string;
  name: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
  venue: string;
  city: string;
  category: string;
  price: number;
  capacity: number;
  sold: number;
  seatsLeft: number;
  rating: number | null;
  reviews: number;
};

type Campaign = {
  Id: string;
  Name: string;
  Description: string | null;
  StartDate: string | null;
  EndDate: string | null;
  Status: string | null;
};

function publicDb() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function adminDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function buildEvents(campaigns: Campaign[]): Promise<EventItem[]> {
  if (campaigns.length === 0) return [];
  const ids = campaigns.map((c) => c.Id);
  const db = publicDb();
  const admin = await adminDb();
  const [{ data: details }, { data: fb }, { data: orders }] = await Promise.all([
    db.from("event_details").select("*").in("campaign_id", ids),
    db.from("feedback").select("campaign_id, rating").in("campaign_id", ids),
    admin.from("orders").select("campaign_id, quantity").in("campaign_id", ids),
  ]);
  return campaigns.map((c) => {
    const d = details?.find((x) => x.campaign_id === c.Id);
    const ratings = (fb ?? []).filter((f) => f.campaign_id === c.Id).map((f) => f.rating);
    const sold = (orders ?? []).filter((o) => o.campaign_id === c.Id).reduce((s, o) => s + o.quantity, 0);
    const capacity = d?.capacity ?? DEFAULT_CAPACITY;
    return {
      id: c.Id,
      name: c.Name,
      description: c.Description ?? "",
      startDate: c.StartDate,
      endDate: c.EndDate,
      status: c.Status ?? "Planned",
      venue: d?.venue || "Venue to be announced",
      city: d?.city || "",
      category: d?.category ?? "Conference",
      price: d ? Number(d.price) : DEFAULT_PRICE,
      capacity,
      sold,
      seatsLeft: seatsLeft(capacity, sold),
      rating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
      reviews: ratings.length,
    };
  });
}

const CAMPAIGN_FIELDS = "Id, Name, Description, StartDate, EndDate, Status";

export const listEvents = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const campaigns = await sfQuery<Campaign>(
      `SELECT ${CAMPAIGN_FIELDS} FROM Campaign WHERE IsActive = true OR Status = 'Planned' OR Status = 'In Progress' ORDER BY StartDate ASC NULLS LAST LIMIT 100`,
    );
    return { events: await buildEvents(campaigns), error: null as string | null };
  } catch (e) {
    console.error(e);
    return { events: [] as EventItem[], error: "Events are unavailable right now." };
  }
});

export const getEvent = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => {
    if (!SF_ID.test(d.id)) throw new Error("Invalid event");
    return d;
  })
  .handler(async ({ data }) => {
    const campaigns = await sfQuery<Campaign>(
      `SELECT ${CAMPAIGN_FIELDS} FROM Campaign WHERE Id = '${soqlString(data.id)}' LIMIT 1`,
    );
    const [event] = await buildEvents(campaigns);
    if (!event) return { event: null, feedback: [] };
    const { data: feedback } = await publicDb()
      .from("feedback")
      .select("id, rating, comment, author_name, created_at")
      .eq("campaign_id", data.id)
      .order("created_at", { ascending: false });
    return { event, feedback: feedback ?? [] };
  });

const purchaseSchema = z.object({
  eventId: z.string().regex(SF_ID),
  quantity: z.number().int().min(1).max(10),
  buyerName: z.string().trim().min(1).max(100),
  buyerEmail: z.string().trim().email().max(255),
});

export const purchaseTickets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof purchaseSchema>) => purchaseSchema.parse(d))
  .handler(async ({ data, context }) => {
    const campaigns = await sfQuery<Campaign>(
      `SELECT ${CAMPAIGN_FIELDS} FROM Campaign WHERE Id = '${soqlString(data.eventId)}' LIMIT 1`,
    );
    const [event] = await buildEvents(campaigns);
    if (!event) throw new Error("Event not found");
    if (event.seatsLeft < data.quantity) throw new Error(`Only ${event.seatsLeft} tickets left`);
    const total = orderTotal(event.price, data.quantity);

    const opportunityId = await sfCreate("Opportunity", {
      Name: `${event.name} — ${data.quantity} ticket(s) — ${data.buyerName}`.slice(0, 120),
      StageName: "Closed Won",
      CloseDate: new Date().toISOString().slice(0, 10),
      Amount: total,
      CampaignId: event.id,
      Description: `Ticket order by ${data.buyerName} <${data.buyerEmail}>`,
    });

    const admin = await adminDb();
    const { data: order, error } = await admin
      .from("orders")
      .insert({
        user_id: context.userId,
        campaign_id: event.id,
        event_name: event.name,
        quantity: data.quantity,
        total,
        buyer_name: data.buyerName,
        buyer_email: data.buyerEmail,
        salesforce_opportunity_id: opportunityId,
      })
      .select("id")
      .single();
    if (error) throw new Error("Could not save your order");
    return { orderId: order.id, total };
  });

export const myTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("orders")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    return data ?? [];
  });

const feedbackSchema = z.object({
  eventId: z.string().regex(SF_ID),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000),
});

export const submitFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof feedbackSchema>) => feedbackSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("display_name")
      .eq("id", context.userId)
      .maybeSingle();
    const { error } = await context.supabase.from("feedback").insert({
      user_id: context.userId,
      campaign_id: data.eventId,
      rating: data.rating,
      comment: data.comment,
      author_name: profile?.display_name ?? "Attendee",
    });
    if (error) {
      if (error.code === "23505") throw new Error("You already reviewed this event");
      throw new Error("Only ticket holders can leave feedback");
    }
    return { ok: true };
  });

const supportSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  subject: z.string().trim().min(3).max(200),
  message: z.string().trim().min(5).max(4000),
});

export const submitSupport = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof supportSchema>) => supportSchema.parse(d))
  .handler(async ({ data }) => {
    const id = await sfCreate("Case", {
      SuppliedName: data.name,
      SuppliedEmail: data.email,
      Subject: data.subject,
      Description: data.message,
      Origin: "Web",
      Status: "New",
    });
    const [c] = await sfQuery<{ CaseNumber: string }>(`SELECT CaseNumber FROM Case WHERE Id = '${id}'`);
    return { caseNumber: String(c?.CaseNumber ?? id) };
  });

// ---------- Organizer ----------

async function assertOrganizer(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "organizer");
  if (!data?.length) throw new Error("Organizer account required");
}

const createSchema = z.object({
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().max(2000),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  venue: z.string().trim().min(1).max(200),
  city: z.string().trim().max(100),
  category: z.string().trim().max(40),
  price: z.number().min(0).max(100000),
  capacity: z.number().int().min(1).max(1000000),
});

export const createEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof createSchema>) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertOrganizer(context.supabase, context.userId);
    if (data.endDate < data.startDate) throw new Error("End date must be after start date");
    const id = await sfCreate("Campaign", {
      Name: data.name,
      Description: data.description,
      StartDate: data.startDate,
      EndDate: data.endDate,
      Status: "Planned",
      IsActive: true,
      Type: "Conference",
      ExpectedRevenue: data.price * data.capacity,
    });
    const { error } = await context.supabase.from("event_details").insert({
      campaign_id: id,
      organizer_id: context.userId,
      venue: data.venue,
      city: data.city,
      category: data.category,
      price: data.price,
      capacity: data.capacity,
    });
    if (error) throw new Error("Event created in Salesforce but details could not be saved");
    return { id };
  });

export const organizerDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOrganizer(context.supabase, context.userId);
    const { data: details } = await context.supabase
      .from("event_details")
      .select("campaign_id")
      .eq("organizer_id", context.userId);
    const ids = (details ?? []).map((d) => d.campaign_id).filter((i) => SF_ID.test(i));
    if (!ids.length) return { events: [] as EventItem[], orders: [], feedback: [] };
    const campaigns = await sfQuery<Campaign>(
      `SELECT ${CAMPAIGN_FIELDS} FROM Campaign WHERE Id IN (${ids.map((i) => `'${i}'`).join(",")})`,
    );
    const events = await buildEvents(campaigns);
    const [{ data: orders }, { data: feedback }] = await Promise.all([
      context.supabase.from("orders").select("*").in("campaign_id", ids).order("created_at", { ascending: false }),
      context.supabase.from("feedback").select("*").in("campaign_id", ids).order("created_at", { ascending: false }),
    ]);
    return { events, orders: orders ?? [], feedback: feedback ?? [] };
  });
