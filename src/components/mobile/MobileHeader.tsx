import { Link } from "react-router-dom";
import { Languages, Bell } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

export const MobileHeader = () => {
  const { lang, setLang } = useLanguage();
  const { user } = useAuth();

  return (
    <header className="md:hidden sticky top-0 z-50 backdrop-blur-xl bg-background/75 border-b border-border/60 safe-area-pt">
      <div className="flex items-center justify-between h-14 px-4">
        <Link to="/" className="flex items-center gap-2 font-display font-extrabold text-lg min-h-12">
          <Logo className="w-8 h-8" />
          Tikiti<span className="text-primary">MW</span>
        </Link>
        <div className="flex items-center gap-1">
          {!user && (
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="min-h-12">
                Sign in
              </Button>
            </Link>
          )}
          <Link to={user ? "/profile" : "/auth"}>
            <Button variant="ghost" size="icon" className="min-h-12 min-w-12">
              <Bell className="w-4 h-4" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="min-h-12"
            onClick={() => setLang(lang === "en" ? "chi" : "en")}
          >
            <Languages className="w-4 h-4" />
            {lang === "en" ? "EN" : "CHI"}
          </Button>
        </div>
      </div>
    </header>
  );
};
