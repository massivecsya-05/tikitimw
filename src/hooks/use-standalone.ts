import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

/** True when running as an installed/native app \u2014 either a Capacitor native
 * build (Android/iOS) or a PWA launched in standalone display mode.
 * Use this to adjust chrome that only makes sense in one context or the other. */
export function useIsStandalone() {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const check = () =>
      Capacitor.isNativePlatform() ||
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(check());

    const mq = window.matchMedia("(display-mode: standalone)");
    const handler = () => setIsStandalone(check());
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  return isStandalone;
}
