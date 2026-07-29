import { SearchBar } from "@/components/SearchBar";
import { Logo } from "@/components/Logo";
import { Bell } from "lucide-react";
import { Link } from "react-router-dom";

export const NativeHomeHeader = () => (
  <div className="px-4 pt-4 pb-3 bg-background">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2 font-display font-extrabold text-lg">
        <Logo className="w-7 h-7" />
        Tikiti<span className="text-primary">MW</span>
      </div>
      <Link to="/profile" className="w-9 h-9 rounded-full bg-muted/60 grid place-items-center">
        <Bell className="w-4 h-4 text-muted-foreground" />
      </Link>
    </div>
    <SearchBar />
  </div>
);
