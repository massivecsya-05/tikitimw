export const formatMWK = (amount: number | string) => {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return "MK " + new Intl.NumberFormat("en-MW", { maximumFractionDigits: 0 }).format(n);
};

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-MW", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

/** e.g. Sat 14 Jun · 7:00 PM */
export const formatDateTimeShort = (iso: string) => {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-MW", { weekday: "short", day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("en-MW", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${date} · ${time}`;
};

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-MW", { hour: "2-digit", minute: "2-digit" });

export const daysUntil = (iso: string) => {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
};

export const urgencyLabel = (iso: string) => {
  const days = daysUntil(iso);
  if (days === 0) return "Happening today";
  if (days === 1) return "Happening tomorrow";
  return `Happening in ${days} days`;
};

export const CATEGORIES = [
  { value: "all", label: "All", emoji: "✨", filterLabel: "All" },
  { value: "concert", label: "Music", emoji: "🎤", filterLabel: "Music" },
  { value: "sports", label: "Sports", emoji: "⚽", filterLabel: "Sports" },
  { value: "conference", label: "Conferences", emoji: "🎯", filterLabel: "Conferences" },
  { value: "cultural", label: "Cultural", emoji: "🪘", filterLabel: "Cultural" },
  { value: "festival", label: "Festivals", emoji: "🎪", filterLabel: "Festivals" },
  { value: "theatre", label: "Comedy", emoji: "🎭", filterLabel: "Comedy" },
  { value: "other", label: "Church Events", emoji: "⛪", filterLabel: "Church Events" },
] as const;

export const FILTER_CITIES = [
  { value: "all", label: "All" },
  { value: "Lilongwe", label: "Lilongwe" },
  { value: "Blantyre", label: "Blantyre" },
  { value: "Mzuzu", label: "Mzuzu" },
  { value: "Zomba", label: "Zomba" },
] as const;

export const PAYMENT_METHODS = [
  { value: "airtel_money", label: "Airtel Money", desc: "Pay via *211#" },
  { value: "tnm_mpamba", label: "TNM Mpamba", desc: "Pay via *444#" },
  { value: "card", label: "Visa / Mastercard", desc: "Debit or credit card" },
  { value: "bank_transfer", label: "Bank Transfer", desc: "Direct deposit" },
] as const;

export type PaymentMethodValue = (typeof PAYMENT_METHODS)[number]["value"];

export function getEventBadge(e: { min_price?: number; total_remaining: number; total_capacity: number }) {
  if (e.total_capacity > 0 && e.total_remaining === 0) return "sold_out" as const;
  if (e.min_price === 0) return "free" as const;
  if (e.total_capacity > 0 && e.total_remaining / e.total_capacity < 0.2) return "limited" as const;
  return null;
}

export function paymentErrorMessage(code?: string): string {
  const map: Record<string, string> = {
    payment_failed: "Your payment could not be completed. Please check your balance and try again.",
    cancelled: "Payment was cancelled. No charge was made.",
    timeout: "The payment request timed out. Tap Resend prompt to try again.",
    declined: "Your mobile money provider declined the payment.",
  };
  return map[code ?? ""] ?? "Something went wrong with your payment. Please try again or use a different method.";
}
