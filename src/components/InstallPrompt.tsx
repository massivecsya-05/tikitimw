import { useEffect, useState } from "react";
import { X, Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

const DISMISS_KEY = "tikitimw_install_dismissed_at";
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function isIos() {
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [showIosSteps, setShowIosSteps] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    if (Date.now() - dismissedAt < DISMISS_COOLDOWN_MS) return;

    if (isIos()) {
      // iOS Safari never fires beforeinstallprompt \u2014 show our own banner
      // pointing at the manual Add to Home Screen steps.
      setVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
    setShowIosSteps(false);
  };

  const install = async () => {
    if (isIos()) {
      setShowIosSteps(true);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted" || outcome === "dismissed") {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
    setDeferredPrompt(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-[60] animate-fade-up">
      <div className="rounded-2xl border border-border/60 bg-card shadow-glow p-4">
        {!showIosSteps ? (
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-hero grid place-items-center shrink-0">
              <Logo className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-sm">Install TikitiMW</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add to your home screen for faster access to your tickets \u2014 even offline.
              </p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="hero" className="min-h-9 flex-1" onClick={install}>
                  <Download className="w-3.5 h-3.5" /> Install
                </Button>
                <Button size="sm" variant="ghost" className="min-h-9" onClick={dismiss}>
                  Not now
                </Button>
              </div>
            </div>
            <button
              onClick={dismiss}
              className="text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="font-display font-bold text-sm">Add to Home Screen</p>
              <button onClick={dismiss} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
                <X className="w-4 h-4" />
              </button>
            </div>
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li className="flex items-center gap-1.5">
                Tap the Share icon <Share className="w-3.5 h-3.5 inline" /> in Safari's toolbar
              </li>
              <li>Scroll down and tap <span className="font-semibold text-foreground">Add to Home Screen</span></li>
              <li>Tap <span className="font-semibold text-foreground">Add</span> to confirm</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
};
