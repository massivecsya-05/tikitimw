import { Link } from "react-router-dom";
import { Languages } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

export const MobileHeader = () => {
  const { lang, setLang } = useLanguage();
  return (
    <header className="md:hidden sticky top-0 z-50 backdrop-blur-xl bg-background/75 border-b border-border/60 safe-area-pt">
      <div className="flex items-center justify-between h-14 px-4">
        <Link to="/" className="flex items-center gap-2 font-display font-extrabold text-lg min-h-12">
          <Logo className="w-8 h-8" />
          Tikiti<span className="text-primary">MW</span>
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
    </header>
  );
};

