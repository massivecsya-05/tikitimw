import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";

export const UpdatePrompt = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-sm">
      <div className="bg-card border border-border shadow-glow rounded-2xl p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-hero grid place-items-center shrink-0">
          <RefreshCw className="w-4 h-4 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">Update available</p>
          <p className="text-xs text-muted-foreground">Tap to load the latest version</p>
        </div>
        <Button size="sm" variant="hero" className="min-h-10" onClick={() => updateServiceWorker(true)}>
          Refresh
        </Button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="text-muted-foreground min-h-10 min-w-10 grid place-items-center shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
