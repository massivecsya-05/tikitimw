export const formatMWK = (amount: number | string) => {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return "MK " + new Intl.NumberFormat("en-MW", { maximumFractionDigits: 0 }).format(n);
};

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-MW", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-MW", { hour: "2-digit", minute: "2-digit" });

export const CATEGORIES = [
  { value: "concert", label: "Concerts", emoji: "🎤" },
  { value: "sports", label: "Sports", emoji: "⚽" },
  { value: "conference", label: "Conferences", emoji: "🎯" },
  { value: "cultural", label: "Cultural", emoji: "🪘" },
  { value: "festival", label: "Festivals", emoji: "🎪" },
  { value: "theatre", label: "Theatre", emoji: "🎭" },
  { value: "other", label: "Other", emoji: "✨" },
] as const;

export const PAYMENT_METHODS = [
  { value: "airtel_money", label: "Airtel Money", desc: "Pay via *211#" },
  { value: "tnm_mpamba", label: "TNM Mpamba", desc: "Pay via *444#" },
  { value: "card", label: "Visa / Mastercard", desc: "Debit or credit card" },
  { value: "bank_transfer", label: "Bank Transfer", desc: "Direct deposit" },
] as const;
