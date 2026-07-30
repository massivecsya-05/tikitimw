import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

/** Opens a URL in the system browser / relevant app (e.g. WhatsApp via wa.me
 * links). Uses Capacitor's Browser plugin on native, since window.open()
 * inside a Capacitor WebView does not reliably hand off to external apps. */
export async function openExternal(url: string) {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url });
  } else {
    window.open(url, "_blank");
  }
}
