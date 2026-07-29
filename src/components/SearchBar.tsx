import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export const SearchBar = () => {
  const nav = useNavigate();
  const [q, setQ] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    nav(q.trim() ? `/events?search=${encodeURIComponent(q.trim())}` : "/events");
  };

  return (
    <form onSubmit={submit} className="relative">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        type="search"
        placeholder="Search events or venues"
        className="w-full h-12 pl-10 pr-4 rounded-xl bg-muted/60 border border-border/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-background transition-colors"
      />
    </form>
  );
};
