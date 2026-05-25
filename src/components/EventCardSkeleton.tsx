export const EventCardSkeleton = () => (
  <div className="rounded-xl border border-border/50 overflow-hidden animate-pulse">
    <div className="aspect-video bg-muted" />
    <div className="p-4 space-y-3">
      <div className="h-5 bg-muted rounded w-4/5" />
      <div className="h-4 bg-muted rounded w-3/5" />
      <div className="h-4 bg-muted rounded w-2/5" />
      <div className="h-12 bg-muted rounded w-full mt-2" />
    </div>
  </div>
);
