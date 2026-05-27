import { Link, useLocation } from "react-router-dom";
import { Home, Compass, Ticket, User } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", icon: Home, key: "nav.home" as const },
  { to: "/events", icon: Compass, key: "nav.explore" as const },
  { to: "/my-tickets", icon: Ticket, key: "nav.tickets" as const },
  { to: "/profile", icon: User, key: "nav.account" as const },
];

export const BottomNav = () => {
  const { pathname } = useLocation();
  const { t } = useLanguage();

  const hide =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/organiser") ||
    pathname.startsWith("/payment");

  if (hide) return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-xl safe-area-pb"
      aria-label="Main navigation"
    >
      <div className="grid grid-cols-4 h-16">
        {tabs.map((tab) => {
          const active = tab.to === "/" ? pathname === "/" : pathname.startsWith(tab.to);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium min-h-12 transition-colors",
                "rounded-xl mx-2",
                active
                  ? "text-primary bg-muted/80 shadow-sm shadow-primary/20"
                  : "text-muted-foreground hover:bg-muted/60",
              )}
            >
              <Icon className="w-5 h-5" />
              {t(tab.key)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
