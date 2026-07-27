import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { BottomNav } from "./mobile/BottomNav";
import { MobileHeader } from "./mobile/MobileHeader";

export const PageShell = ({ children, hideFooter }: { children: ReactNode; hideFooter?: boolean }) => (
  <div className="min-h-screen flex flex-col">
    <MobileHeader />
    <Navbar />
    <main className="flex-1 pb-20 md:pb-0">{children}</main>
    {!hideFooter && <Footer className="hidden md:block" />}
    <BottomNav />
  </div>
);
