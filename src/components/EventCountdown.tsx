import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

function getParts(targetMs: number, nowMs: number) {
  const diff = Math.max(0, targetMs - nowMs);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { diff, days, hours, minutes, seconds };
}

const pad = (n: number) => String(n).padStart(2, "0");

export const EventCountdown = ({
  startsAt,
  compact = false,
  className = "",
}: {
  startsAt: string;
  compact?: boolean;
  className?: string;
}) => {
  const target = new Date(startsAt).getTime();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { diff, days, hours, minutes, seconds } = getParts(target, now);

  if (diff <= 0) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground ${className}`}>
        <Timer className="w-3 h-3" /> Event started
      </span>
    );
  }

  if (compact) {
    const label =
      days > 0 ? `${days}d ${pad(hours)}h` : hours > 0 ? `${hours}h ${pad(minutes)}m` : `${minutes}m ${pad(seconds)}s`;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold ${className}`}
      >
        <Timer className="w-3 h-3" /> {label}
      </span>
    );
  }

  const units = [
    { v: days, l: "Days" },
    { v: hours, l: "Hrs" },
    { v: minutes, l: "Min" },
    { v: seconds, l: "Sec" },
  ];

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {units.map((u) => (
        <div
          key={u.l}
          className="min-w-[3.25rem] text-center px-2 py-1.5 rounded-lg bg-background/80 border border-border/60 backdrop-blur"
        >
          <div className="font-display font-extrabold text-lg leading-none tabular-nums">{pad(u.v)}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{u.l}</div>
        </div>
      ))}
    </div>
  );
};
