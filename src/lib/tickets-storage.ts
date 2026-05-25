const KEY = "tikitimw_offline_tickets";

export interface StoredTicket {
  id: string;
  order_id: string;
  qr_code: string;
  event_title: string;
  venue: string;
  city: string;
  starts_at: string;
  banner_url: string | null;
  tier_name: string;
  unit_price_mwk: number;
  checked_in: boolean;
  saved_at: string;
}

export function saveTicketsOffline(tickets: StoredTicket[]) {
  const existing = getOfflineTickets();
  const map = new Map(existing.map((t) => [t.id, t]));
  tickets.forEach((t) => map.set(t.id, t));
  localStorage.setItem(KEY, JSON.stringify([...map.values()]));
}

export function getOfflineTickets(): StoredTicket[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as StoredTicket[];
  } catch {
    return [];
  }
}

export function getOfflineTicket(id: string): StoredTicket | undefined {
  return getOfflineTickets().find((t) => t.id === id);
}
