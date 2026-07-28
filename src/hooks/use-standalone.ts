import { useEffect, useState } from "react";

/** True when the app is running installed (standalone), not inside a browser tab.
 * Use this to adjust chrome that only makes sense in one context or the other. */
export function useIsStandalone() {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const check = () =>
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
