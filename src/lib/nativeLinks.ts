import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

/** Opens a URL in the system browser / relevant app (e.g. WhatsApp via wa.me
 * links). Uses Capacitor's Browser plugin on native, since window.open()
 * inside a Capacitor WebView does not reliably hand off to external apps. */
export async function openExternal(url: string) {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url });
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

/** Redirect to PayChangu checkout — must leave the WebView on native. */
export async function openPaymentUrl(url: string): Promise<"native" | "redirect"> {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url });
    return "native";
  }
  window.location.assign(url);
  return "redirect";
}
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

/** Saves/shares a base64 file. Uses Android's native Share sheet on Capacitor,
 * falls back to a normal browser download on web. */
export async function saveOrShareFile(base64: string, fileName: string, shareTitle: string) {
  if (Capacitor.isNativePlatform()) {
    const result = await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache });
    await Share.share({ title: shareTitle, url: result.uri, dialogTitle: "Save or share file" });
  } else {
    const link = document.createElement("a");
    link.href = `data:application/pdf;base64,${base64}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}

