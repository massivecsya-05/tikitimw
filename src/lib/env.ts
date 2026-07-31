// The real, publicly reachable URL of the app. Anything generated inside the
// native build (Capacitor serves the WebView from an internal scheme, not
// this domain) or emailed to a user must use this instead of
// window.location.origin, which is unreliable outside a normal browser tab.
export const APP_URL =
  import.meta.env.VITE_APP_URL ?? "https://tikitimw.tikiti.workers.dev";

/** Origin used for payment return URLs and share links. */
export function getAppOrigin(): string {
  if (typeof window === "undefined") return APP_URL;
  const { origin, hostname } = window.location;
  if (
    origin.startsWith("capacitor://") ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  ) {
    return hostname === "localhost" || hostname === "127.0.0.1" ? origin : APP_URL;
  }
  return origin || APP_URL;
}
