import { lazy, Suspense, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { SplashScreen } from "@/components/SplashScreen";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { captureReferralFromUrl } from "@/lib/referral";
import Home from "./pages/Home";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import Auth from "./pages/Auth";
import MyTickets from "./pages/MyTickets";
import TicketDetail from "./pages/TicketDetail";
import VendorDashboard from "./pages/VendorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import BecomeVendor from "./pages/BecomeVendor";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import PaymentCallback from "./pages/PaymentCallback";
import Scanner from "./pages/Scanner";
import ResetPassword from "./pages/ResetPassword";
import ForgotPassword from "./pages/ForgotPassword";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
  },
});

const App = () => {
  useEffect(() => {
    captureReferralFromUrl();
  }, []);
  const [showSplash, setShowSplash] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 9000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <AnimatePresence>{showSplash && <SplashScreen />}</AnimatePresence>
      <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthProvider>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/events" element={<Events />} />
                  <Route path="/events/:id" element={<EventDetail />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/dashboard" element={<Navigate to="/my-tickets" replace />} />
                  <Route path="/my-tickets" element={<MyTickets />} />
                  <Route path="/my-tickets/:id" element={<TicketDetail />} />
                  <Route path="/vendor" element={<Navigate to="/organiser/dashboard" replace />} />
                  <Route path="/organiser/dashboard" element={<VendorDashboard />} />
                  <Route
                    path="/organiser/scan"
                    element={
                      <Suspense fallback={<div className="min-h-screen bg-background" />}>
                        <Scanner />
                      </Suspense>
                    }
                  />
                  <Route path="/organiser/check-in" element={<Navigate to="/organiser/scan" replace />} />
                  <Route path="/organiser/create" element={<Navigate to="/organiser/dashboard" replace />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />
                  <Route path="/become-vendor" element={<BecomeVendor />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/payment/callback" element={<PaymentCallback />} />
                  <Route path="/scanner" element={<Navigate to="/organiser/scan" replace />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </HelmetProvider>
    </>
  );
};

export default App;


