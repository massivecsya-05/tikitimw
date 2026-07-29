import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type TicketTierRow = Database["public"]["Tables"]["ticket_tiers"]["Row"];
export type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];

export interface EventCardData {
  id: string;
  title: string;
  city: string;
  venue: string;
  starts_at: string;
  banner_url: string | null;
  category: string;
  description?: string | null;
  min_price?: number;
  total_capacity: number;
  total_remaining: number;
}

export interface EventFilters {
  category?: string;
  city?: string;
  dateRange?: "all" | "weekend" | "month" | "upcoming";
  freeOnly?: boolean;
  paidOnly?: boolean;
  search?: string;
}

type TierAgg = { event_id: string; price_mwk: number; quantity: number; sold: number };

export function enrichEventsWithTiers(
  events: Pick<EventRow, "id" | "title" | "city" | "venue" | "starts_at" | "banner_url" | "category" | "description">[],
  tiers: TierAgg[],
): EventCardData[] {
  const byEvent: Record<string, TierAgg[]> = {};
  tiers.forEach((t) => {
    (byEvent[t.event_id] ??= []).push(t);
  });

  return events.map((e) => {
    const evTiers = byEvent[e.id] ?? [];
    let minPrice: number | undefined;
    let totalCapacity = 0;
    let totalRemaining = 0;
    evTiers.forEach((t) => {
      const p = Number(t.price_mwk);
      if (minPrice === undefined || p < minPrice) minPrice = p;
      totalCapacity += t.quantity;
      const sold = Number(t.sold ?? 0);
      totalRemaining += Math.max(0, t.quantity - sold);
    });
    return {
      ...e,
      min_price: minPrice,
      total_capacity: totalCapacity,
      total_remaining: totalRemaining,
    };
  });
}

export async function fetchPublishedEvents(limit?: number) {
  let query = supabase
    .from("events")
    .select("id,title,city,venue,starts_at,banner_url,category,description")
    .eq("status", "published")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });
  if (limit) query = query.limit(limit);
  const { data: events, error } = await query;
  if (error) throw error;
  if (!events?.length) return [] as EventCardData[];
  const ids = events.map((e) => e.id);
  const { data: tiers, error: tErr } = await supabase
    .from("ticket_tiers")
    .select("event_id,price_mwk,quantity,sold")
    .in("event_id", ids);
  if (tErr) throw tErr;
  return enrichEventsWithTiers(events, tiers ?? []);
}

export async function deleteEvent(eventId: string) {
  const { error } = await supabase.rpc("delete_event", { p_event_id: eventId });
  if (error) throw error;
}

export async function fetchEventById(id: string) {
  const { data, error } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchEventTiers(eventId: string) {
  const { data, error } = await supabase
    .from("ticket_tiers")
    .select("*")
    .eq("event_id", eventId)
    .order("price_mwk");
  if (error) throw error;
  const now = Date.now();
  return (data ?? []).filter((t: any) => {
    const active = t.is_active !== false;
    const started = !t.sale_start || new Date(t.sale_start).getTime() <= now;
    const notEnded = !t.sale_end || new Date(t.sale_end).getTime() >= now;
    return active && started && notEnded;
  });
}

export async function fetchAllPublishedEvents() {
  return fetchPublishedEvents();
}

export function filterEvents(events: EventCardData[], filters: EventFilters): EventCardData[] {
  const now = new Date();
  const q = filters.search?.trim().toLowerCase() ?? "";

  return events.filter((e) => {
    if (q) {
      const hay = `${e.title} ${e.venue} ${e.city} ${e.description ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.category && filters.category !== "all" && e.category !== filters.category) return false;
    if (filters.city && filters.city !== "all" && e.city.toLowerCase() !== filters.city.toLowerCase()) return false;
    if (filters.freeOnly && (e.min_price ?? 1) > 0) return false;
    if (filters.paidOnly && (e.min_price ?? 0) === 0) return false;

    const start = new Date(e.starts_at);
    if (filters.dateRange === "weekend") {
      const day = start.getDay();
      const daysUntil = (6 - day + 7) % 7;
      const weekendStart = new Date(now);
      weekendStart.setDate(now.getDate() + (day === 6 ? 0 : daysUntil));
      weekendStart.setHours(0, 0, 0, 0);
      const weekendEnd = new Date(weekendStart);
      weekendEnd.setDate(weekendStart.getDate() + 2);
      if (start < weekendStart || start >= weekendEnd) return false;
    } else if (filters.dateRange === "month") {
      if (start.getMonth() !== now.getMonth() || start.getFullYear() !== now.getFullYear()) return false;
    } else if (filters.dateRange === "upcoming") {
      if (start < now) return false;
    }
    return true;
  });
}

export interface UserTicketItem {
  id: string;
  order_id: string;
  quantity: number;
  unit_price_mwk: number;
  qr_code: string;
  checked_in: boolean;
  status: "unused" | "used" | "cancelled";
  created_at: string;
  tier_id: string;
  events: {
    title: string;
    venue: string;
    city: string;
    starts_at: string;
    banner_url: string | null;
  } | null;
  orders: { id: string; customer_id: string; status: string; created_at: string };
  ticket_tiers: { name: string; price_mwk?: number } | null;
}

/**
 * Reads from the `tickets` table \u2014 the same table the gate scanner (scan_ticket RPC)
 * checks against \u2014 so what a customer sees in My Tickets always matches what will
 * actually scan at the door. One row per physical ticket.
 */
export async function fetchUserTickets(customerId: string): Promise<UserTicketItem[]> {
  const { data, error } = await supabase
    .from("tickets" as any)
    .select(
      "id,order_id,event_id,tier_id,status,created_at,orders!inner(id,customer_id,status,created_at),events(title,venue,city,starts_at,banner_url),ticket_tiers(name,price_mwk)",
    )
    .eq("orders.customer_id", customerId)
    .eq("orders.status", "paid")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    order_id: row.order_id,
    quantity: 1,
    unit_price_mwk: Number(row.ticket_tiers?.price_mwk ?? 0),
    qr_code: row.id,
    checked_in: row.status === "used",
    status: row.status,
    created_at: row.created_at,
    tier_id: row.tier_id,
    events: row.events,
    orders: row.orders,
    ticket_tiers: row.ticket_tiers ? { name: row.ticket_tiers.name } : null,
  }));
}

export interface HomeStats {
  ticketsSold: number;
  eventsHosted: number;
  organisers: number;
}

/** Public homepage stats \u2014 backed by the get_home_stats() RPC, which is
 * SECURITY DEFINER so it can aggregate across all orders/events safely
 * without exposing any row-level data to anonymous visitors. */
export async function fetchHomeStats(): Promise<HomeStats> {
  const { data, error } = await supabase.rpc("get_home_stats" as any);
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    ticketsSold: Number(row?.tickets_sold ?? 0),
    eventsHosted: Number(row?.events_hosted ?? 0),
    organisers: Number(row?.organisers ?? 0),
  };
}

export { detectMobileNetwork } from "@/lib/format";

export async function createPendingOrder(params: {
  customerId: string;
  totalMwk: number;
  paymentMethod: Database["public"]["Enums"]["payment_method"];
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
}) {
  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      customer_id: params.customerId,
      total_mwk: params.totalMwk,
      status: "pending",
      payment_method: params.paymentMethod,
      customer_email: params.customerEmail ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  if (!order) throw new Error("Could not create order");
  return order;
}

export async function insertOrderItems(
  items: Database["public"]["Tables"]["order_items"]["Insert"][],
) {
  const { error } = await supabase.from("order_items").insert(items);
  if (error) throw error;
}

export async function initiatePayment(orderId: string, customerEmail: string, returnUrl: string) {
  const { data, error } = await supabase.functions.invoke("initiate-payment", {
    body: { order_id: orderId, customer_email: customerEmail, return_url: returnUrl },
  });
  if (error) {
    let detail: string | undefined;
    try {
      const resp = (error as { context?: { response?: Response } })?.context?.response;
      if (resp) {
        const body = await resp.clone().json().catch(() => null);
        detail = body?.error || (body?.detail && JSON.stringify(body.detail));
      }
    } catch {
      /* ignore */
    }
    console.error("initiate-payment failed", { error, detail });
    throw new Error(detail || (error as Error).message || "Could not start payment");
  }
  return data as { checkout_url?: string; error?: string };
}

/** Creates ticket rows (and sends email when configured) for a paid order. */
export async function ensureOrderTickets(orderId: string) {
  const { data, error } = await supabase.functions.invoke("send-ticket-email", {
    body: { order_id: orderId, tickets_only: true },
  });
  if (error) throw error;
  return data as { ok?: boolean; error?: string; tickets_count?: number; skipped?: string };
}

export async function submitVendorApplication(userId: string) {
  const { data, error } = await supabase
    .from("vendor_applications" as any)
    .insert({ user_id: userId, status: "pending" })
    .select("id")
    .single();
  if (error) throw error;
  return data;
}


export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  event_id: string | null;
  created_at: string;
  is_read: boolean;
}

export async function fetchNotificationPreference(userId: string) {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("event_notifications_enabled")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.event_notifications_enabled ?? true;
}

export async function updateNotificationPreference(userId: string, enabled: boolean) {
  const { error } = await supabase
    .from("notification_preferences")
    .upsert({ user_id: userId, event_notifications_enabled: enabled, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function fetchNotifications(userId: string): Promise<NotificationItem[]> {
  const eventsEnabled = await fetchNotificationPreference(userId);

  let query = supabase
    .from("notifications")
    .select("id,type,title,body,event_id,created_at")
    .order("created_at", { ascending: false });

  if (!eventsEnabled) {
    query = query.eq("type", "broadcast");
  }

  const { data: notifications, error } = await query;
  if (error) throw error;

  const { data: reads, error: rErr } = await supabase
    .from("notification_reads")
    .select("notification_id")
    .eq("user_id", userId);
  if (rErr) throw rErr;

  const readIds = new Set((reads ?? []).map((r) => r.notification_id));

  return (notifications ?? []).map((n) => ({
    ...n,
    is_read: readIds.has(n.id),
  }));
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const { error } = await supabase
    .from("notification_reads")
    .upsert({ user_id: userId, notification_id: notificationId }, { onConflict: "notification_id,user_id" });
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string, notificationIds: string[]) {
  if (!notificationIds.length) return;
  const rows = notificationIds.map((id) => ({ user_id: userId, notification_id: id }));
  const { error } = await supabase
    .from("notification_reads")
    .upsert(rows, { onConflict: "notification_id,user_id" });
  if (error) throw error;
}

export async function sendBroadcastNotification(title: string, body: string, createdBy: string) {
  const { error } = await supabase
    .from("notifications")
    .insert({ type: "broadcast", title, body, created_by: createdBy });
  if (error) throw error;
}
