import { Link, useLocation } from "react-router-dom";
import { Home, Compass, Ticket, User, Store } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export const BottomNav = () => {
  const { pathname } = useLocation();
  const { roles, loading } = useAuth();
  const { t } = useLanguage();
  const canManageEvents = roles.includes("vendor") || roles.includes("admin");

  const tabs = [
    { to: "/", icon: Home, label: t("nav.home") },
    { to: "/events", icon: Compass, label: t("nav.explore") },
    ...(canManageEvents ? [{ to: "/organiser/dashboard", icon: Store, label: t("nav.organiser") }] : []),
    { to: "/my-tickets", icon: Ticket, label: t("nav.tickets") },
    { to: "/profile", icon: User, label: t("nav.account") },
  ];

  const hide =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/payment");

  if (hide || loading) return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-xl safe-area-pb"
      aria-label="Main navigation"
    >
      <div className={cn("grid h-16", canManageEvents ? "grid-cols-5" : "grid-cols-4")}>
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
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};