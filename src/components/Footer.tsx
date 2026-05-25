import { Link } from "react-router-dom";
import { Ticket } from "lucide-react";

import { cn } from "@/lib/utils";

export const Footer = ({ className }: { className?: string }) => (
  <footer className={cn("border-t border-border/60 bg-muted/30 mt-24", className)}>
    <div className="container mx-auto px-4 py-14 grid md:grid-cols-4 gap-10">
      <div>
        <div className="flex items-center gap-2 font-display font-extrabold text-xl mb-3">
          <span className="w-9 h-9 rounded-xl bg-gradient-hero grid place-items-center shadow-glow">
            <Ticket className="w-5 h-5 text-primary-foreground" />
          </span>
          Tikiti<span className="text-primary">MW</span>
        </div>
        <p className="text-sm text-muted-foreground max-w-xs">
          Malawi's home for events. From the warm heart of Africa to your phone.
        </p>
      </div>
      <div>
        <h4 className="font-display font-bold mb-3">Discover</h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li><Link to="/events" className="hover:text-primary">All events</Link></li>
          <li><Link to="/events?category=concert" className="hover:text-primary">Concerts</Link></li>
          <li><Link to="/events?category=festival" className="hover:text-primary">Festivals</Link></li>
          <li><Link to="/events?category=sports" className="hover:text-primary">Sports</Link></li>
        </ul>
      </div>
      <div>
        <h4 className="font-display font-bold mb-3">For Organizers</h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li><Link to="/become-vendor" className="hover:text-primary">Sell tickets</Link></li>
          <li><Link to="/vendor" className="hover:text-primary">Vendor dashboard</Link></li>
        </ul>
      </div>
      <div>
        <h4 className="font-display font-bold mb-3">Payments accepted</h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>Airtel Money</li>
          <li>TNM Mpamba</li>
          <li>Visa / Mastercard</li>
          <li>Bank transfer</li>
        </ul>
      </div>
    </div>
    <div className="border-t border-border/60 py-5 text-center text-xs text-muted-foreground">
      © {new Date().getFullYear()} TikitiMW. Lilongwe · Blantyre · Mzuzu · Zomba
    </div>
  </footer>
);
