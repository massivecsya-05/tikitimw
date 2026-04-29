import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Ticket, User, LogOut, LayoutDashboard, Store, Shield } from "lucide-react";

export const Navbar = () => {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/75 border-b border-border/60">
      <nav className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2 font-display font-extrabold text-xl">
          <span className="w-9 h-9 rounded-xl bg-gradient-hero grid place-items-center shadow-glow">
            <Ticket className="w-5 h-5 text-primary-foreground" />
          </span>
          <span>Tikiti<span className="text-primary">MW</span></span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link to="/events" className="hover:text-primary transition-smooth">Events</Link>
          <Link to="/events?category=concert" className="hover:text-primary transition-smooth">Concerts</Link>
          <Link to="/events?category=sports" className="hover:text-primary transition-smooth">Sports</Link>
          <Link to="/events?category=cultural" className="hover:text-primary transition-smooth">Cultural</Link>
          <Link to="/become-vendor" className="hover:text-primary transition-smooth">Sell Tickets</Link>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <span className="w-8 h-8 rounded-full bg-gradient-emerald text-secondary-foreground grid place-items-center text-sm font-bold">
                    {user.email?.[0].toUpperCase()}
                  </span>
                  <span className="hidden sm:inline">My Account</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => navigate("/dashboard")}><LayoutDashboard className="w-4 h-4 mr-2"/>My Tickets</DropdownMenuItem>
                {roles.includes("vendor") && (
                  <DropdownMenuItem onClick={() => navigate("/vendor")}><Store className="w-4 h-4 mr-2"/>Vendor Dashboard</DropdownMenuItem>
                )}
                {roles.includes("admin") && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}><Shield className="w-4 h-4 mr-2"/>Admin Console</DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => navigate("/profile")}><User className="w-4 h-4 mr-2"/>Profile</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => { await signOut(); navigate("/"); }}>
                  <LogOut className="w-4 h-4 mr-2"/>Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>Sign in</Button>
              <Button variant="hero" size="sm" onClick={() => navigate("/auth?mode=signup")}>Get started</Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};
