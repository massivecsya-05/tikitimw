export const TicketDivider = () => (
  <div className="relative py-2">
    <div className="container mx-auto px-4">
      <div className="relative">
        <span className="absolute -left-[9px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full bg-background border border-border/40" />
        <span className="absolute -right-[9px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full bg-background border border-border/40" />
        <div className="mx-4 border-t-2 border-dashed border-border/50" />
      </div>
    </div>
  </div>
);
