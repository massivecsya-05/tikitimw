// The real, publicly reachable URL of the app. Anything generated inside the
// native build (Capacitor serves the WebView from an internal scheme, not
// this domain) or emailed to a user must use this instead of
// window.location.origin, which is unreliable outside a normal browser tab.
export const APP_URL = "https://tikitimw.tikiti.workers.dev";
