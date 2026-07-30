const CODE_KEY = "tikitimw_referral_code";
const REF_PARAM = "ref";
// Fixed production URL \u2014 required because window.location.origin is unreliable
// inside the native app (Capacitor serves from an internal scheme, not the real
// domain), so referral/share links must always point at the real hosted site
// regardless of where the code is currently running.
const BASE_URL = "https://tikitimw.tikiti.workers.dev";

export function getOrCreateReferralCode(userId: string): string {
  const stored = localStorage.getItem(`${CODE_KEY}_${userId}`);
  if (stored) return stored;
  const code = userId.slice(0, 8).toUpperCase();
  localStorage.setItem(`${CODE_KEY}_${userId}`, code);
  return code;
}

export function getReferralLink(userId: string, path = "/events"): string {
  const code = getOrCreateReferralCode(userId);
  const url = new URL(path, BASE_URL);
  url.searchParams.set(REF_PARAM, code);
  return url.toString();
}

export function captureReferralFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get(REF_PARAM);
  if (ref) {
    localStorage.setItem("tikitimw_pending_ref", ref);
    return ref;
  }
  return null;
}

export function getPendingReferral(): string | null {
  return localStorage.getItem("tikitimw_pending_ref");
}

export function clearPendingReferral() {
  localStorage.removeItem("tikitimw_pending_ref");
}

export function grantReferralReward(referrerCode: string) {
  const rewards = JSON.parse(localStorage.getItem("tikitimw_referral_rewards") ?? "[]") as string[];
  rewards.push(`MWK500-${referrerCode}-${Date.now()}`);
  localStorage.setItem("tikitimw_referral_rewards", JSON.stringify(rewards));
}

export function whatsappShareUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function eventWhatsAppText(params: {
  title: string;
  date: string;
  venue: string;
  city: string;
  url: string;
}) {
  return `Check out this event on Tikiti Malawi! ${params.title} on ${params.date} at ${params.venue}, ${params.city}. Book here: ${params.url}`;
}

