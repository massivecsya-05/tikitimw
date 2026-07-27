import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, LayoutDashboard, Store, Shield, Languages } from "lucide-react";
import { Logo } from "@/components/Logo";

export const Navbar = () => {
  const { user, roles, signOut } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/75 border-b border-border/60 hidden md:block">
      <nav className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link
          to="/"
          className="flex items-center gap-2 font-display font-extrabold text-xl min-h-12"
        >
          <Logo className="w-9 h-9" />
          <span>
            Tikiti<span className="text-primary">MW</span>
          </span>
        </Link>

        <div className="flex items-center gap-8 text-sm font-medium">
          <Link
            to="/"
            className={cn(
              "min-h-12 inline-flex items-center border-b-2 border-transparent hover:border-primary/40 hover:text-primary transition-smooth",
              pathname === "/" && "text-primary border-primary",
            )}
          >
            {t("nav.home")}
          </Link>
          <Link
            to="/events"
            className={cn(
              "min-h-12 inline-flex items-center border-b-2 border-transparent hover:border-primary/40 hover:text-primary transition-smooth",
              pathname.startsWith("/events") && "text-primary border-primary",
            )}
          >
            {t("nav.explore")}
          </Link>
          <Link
            to="/become-vendor"
            className={cn(
              "min-h-12 inline-flex items-center border-b-2 border-transparent hover:border-primary/40 hover:text-primary transition-smooth",
              pathname.startsWith("/become-vendor") && "text-primary border-primary",
            )}
          >
            {t("nav.sell")}
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 min-h-12"
            onClick={() => setLang(lang === "en" ? "chi" : "en")}
            aria-label="Toggle language"
          >
            <Languages className="w-4 h-4" />
            {lang === "en" ? "EN" : "CHI"}
          </Button>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 min-h-12">
                  <span className="w-8 h-8 rounded-full bg-gradient-emerald text-secondary-foreground grid place-items-center text-sm font-bold">
                    {user.email?.[0].toUpperCase()}
                  </span>
                  <span className="hidden sm:inline">{t("nav.account")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => navigate("/my-tickets")}>
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  {t("nav.tickets")}
                </DropdownMenuItem>
                {roles.includes("vendor") && (
                  <DropdownMenuItem onClick={() => navigate("/organiser/dashboard")}>
                    <Store className="w-4 h-4 mr-2" />
                    {t("nav.organiser")}
                  </DropdownMenuItem>
                )}
                {roles.includes("admin") && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <Shield className="w-4 h-4 mr-2" />
                    {t("nav.admin")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="w-4 h-4 mr-2" />
                  {t("nav.profile")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await signOut();
                    navigate("/");
                  }}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t("profile.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="min-h-12" onClick={() => navigate("/auth")}>
                {t("nav.signIn")}
              </Button>
              <Button variant="hero" size="sm" className="min-h-12" onClick={() => navigate("/auth?mode=signup")}>
                {t("nav.getStarted")}
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};
