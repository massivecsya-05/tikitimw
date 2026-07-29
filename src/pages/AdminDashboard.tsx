import { useEffect, useState } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { deleteEvent, sendBroadcastNotification } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { formatMWK, formatDate } from "@/lib/format";
import {
  Users, CalendarDays, Ticket, DollarSign, Shield, Activity,
  TrendingUp, Search, Crown, Store, UserCheck,
  Eye, EyeOff, Trash2, Mail, Settings as SettingsIcon, Wallet, Save,
  ClipboardList, CheckCircle2, XCircle, Loader2, LogOut, ArrowLeft, Ban, Bell, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Tab = "overview" | "users" | "applications" | "events" | "payouts" | "settings" | "audit" | "broadcast";

const AdminDashboard = () => {
  const { user, roles, loading, signOut } = useAuth();
  const { t } = useLanguage();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [dataLoading, setDataLoading] = useState(true);
  const [stats, setStats] = useState({
    users: 0, activeEvents: 0, tickets: 0, revenue: 0,
    pendingOrders: 0, paidOrders: 0, vendorsCount: 0, draftEvents: 0,
  });
  const [users, setUsers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [paidTransactions, setPaidTransactions] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [payouts, setPayouts] = useState<any[]>([]);
  const [vendorApps, setVendorApps] = useState<any[]>([]);
  const [settingsRow, setSettingsRow] = useState<{ fee_percent: number; fee_flat_mwk: number }>({ fee_percent: 5, fee_flat_mwk: 200 });
  const [savingSettings, setSavingSettings] = useState(false);
  const [reviewingApp, setReviewingApp] = useState<string | null>(null);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const load = async () => {
    setDataLoading(true);
    try {
    const [
      { data: profiles },
      { data: ev },
      { data: items },
      { data: rolesData },
      { data: orders },
      emailsRes,
      { data: payoutsData },
      { data: settingsData },
      { data: vendorAppsData },
      { data: auditData },
    ] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("events").select("*").order("created_at", { ascending: false }),
      supabase.from("order_items").select("quantity,order_id"),
      supabase.from("user_roles").select("user_id,role"),
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.functions.invoke("admin-users", { body: { action: "list" } }),
      supabase.from("vendor_payouts").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("platform_settings").select("fee_percent,fee_flat_mwk").eq("id", true).maybeSingle(),
      supabase.from("vendor_applications" as any).select("*").eq("status", "pending").order("created_at", { ascending: true }),
      supabase.from("admin_activity_log" as any).select("*").order("created_at", { ascending: false }).limit(200),
    ]);

    const rolesByUser: Record<string, string[]> = {};
    rolesData?.forEach((r) => { (rolesByUser[r.user_id] ||= []).push(r.role); });
    const emails: Record<string, string> = (emailsRes as any)?.data?.emails ?? {};
    const enrichedUsers = (profiles ?? []).map((p) => ({ ...p, roles: rolesByUser[p.id] ?? [], email: emails[p.id] ?? "" }));
    setUsers(enrichedUsers);
    setEvents(ev ?? []);
    setPayouts(payoutsData ?? []);
    setVendorApps((vendorAppsData as any[]) ?? []);
    setAuditLog((auditData as any[]) ?? []);
    if (settingsData) setSettingsRow({ fee_percent: Number(settingsData.fee_percent), fee_flat_mwk: Number(settingsData.fee_flat_mwk) });

    const paid = (orders ?? []).filter((o) => o.status === "paid");
    const paidOrderIds = new Set(paid.map((o) => o.id));
    const paidItems = (items ?? []).filter((i) => paidOrderIds.has(i.order_id));

    setPaidTransactions(paid);
    setStats({
      users: profiles?.length ?? 0,
      activeEvents: ev?.filter((e: any) => e.status === "published").length ?? 0,
      tickets: paidItems.reduce((s, i) => s + Number(i.quantity), 0),
      revenue: paid.reduce((s, o) => s + Number(o.total_mwk), 0),
      pendingOrders: orders?.filter((o) => o.status === "pending").length ?? 0,
      paidOrders: paid.length,
      vendorsCount: enrichedUsers.filter((u) => u.roles.includes("vendor")).length,
      draftEvents: ev?.filter((e: any) => e.status === "draft").length ?? 0,
    });
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => { if (roles.includes("admin")) load(); }, [roles]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth?redirect=/admin" />;
  if (!roles.includes("admin"))
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <Shield className="w-12 h-12 mx-auto text-slate-600 mb-4" />
          <h1 className="font-display text-3xl mb-2">Admin only</h1>
          <p className="text-slate-400 mb-6">You don't have admin privileges on this account.</p>
          <Button asChild variant="hero"><Link to="/">Back to site</Link></Button>
        </div>
      </div>
    );

  const grantRole = async (uid: string, role: "vendor" | "admin") => {
    const { error } = await supabase.from("user_roles").insert({ user_id: uid, role });
    if (error && !error.message.includes("duplicate")) return toast.error(error.message);
    toast.success(`Granted ${role}`); load();
  };
  const revokeRole = async (uid: string, role: "vendor" | "admin") => {
    await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", role);
    toast.success(`Revoked ${role}`); load();
  };

  const reviewVendorApp = async (applicationId: string, approve: boolean) => {
    setReviewingApp(applicationId);
    const tId = toast.loading(approve ? "Approving vendor\u2026" : "Rejecting application\u2026");
    const { data, error } = await supabase.functions.invoke("vendor-application", {
      body: { action: approve ? "approve" : "reject", application_id: applicationId },
    });
    toast.dismiss(tId);
    setReviewingApp(null);
    if (error || (data as any)?.error) return toast.error((data as any)?.error ?? error!.message);
    toast.success(approve ? "Vendor approved \u2014 confirmation email sent" : "Application rejected");
    load();
  };

  const toggleEventStatus = async (ev: any) => {
    const next = ev.status === "published" ? "draft" : "published";
    const { error } = await supabase.from("events").update({ status: next }).eq("id", ev.id);
    if (error) return toast.error(error.message);
    toast.success(`Event ${next === "published" ? "published" : "unpublished"}`);
    load();
  };

  const removeEvent = async (id: string, label?: string) => {
    if (!confirm("Delete this event? Ticket and order line items for this event will be removed.")) return;
    const tId = toast.loading(`Deleting event ${label ?? id.slice(0, 8)}\u2026`);
    try {
      await deleteEvent(id);
      await supabase.from("admin_activity_log" as any).insert({
        actor_id: user!.id,
        actor_email: user!.email ?? null,
        action: "event_deleted",
        target_type: "event",
        target_id: id,
        target_label: label ?? id.slice(0, 8),
      } as any);
      toast.dismiss(tId);
      toast.success(`Event deleted: ${label ?? id.slice(0, 8)}`);
      load();
    } catch (e: any) {
      toast.dismiss(tId);
      const raw = e?.message ?? String(e);
      const friendly = /foreign key|violates/i.test(raw)
        ? "Cannot delete this event \u2014 related tickets or orders still reference it."
        : raw;
      toast.error("Delete event failed", {
        description: `${friendly}\nEvent ID: ${id.slice(0, 8)}`,
      });
    }
  };

  const cancelEvent = async (ev: any) => {
    const reason = prompt(
      `Cancel "${ev.title}"? This invalidates all unused tickets and notifies paid customers by email.\n\nOptional reason to include in the notification (leave blank to skip):`,
    );
    if (reason === null) return;
    const tId = toast.loading("Cancelling event and notifying customers\u2026");
    const { data, error } = await supabase.functions.invoke("cancel-event", {
      body: { event_id: ev.id, reason: reason || undefined },
    });
    toast.dismiss(tId);
    if (error || (data as any)?.error) return toast.error((data as any)?.error ?? error!.message);
    if ((data as any)?.already_cancelled) return toast.message("Event was already cancelled");
    toast.success(
      `Event cancelled \u2014 ${(data as any).affected_count} affected order(s), ${(data as any).emails_sent} notification email(s) sent`,
    );
    load();
  };

  const deleteUser = async (uid: string, label: string) => {
    if (!confirm(`Permanently delete user ${label}? This removes their account, profile, orders and tickets.`)) return;
    const tId = toast.loading(`Deleting user ${label}\u2026`);
    const { data, error } = await supabase.functions.invoke("admin-users", { body: { action: "delete", user_id: uid } });
    toast.dismiss(tId);
    const payload = (data as any) ?? {};
    if (error || payload.error) {
      const friendly = payload.error ?? error?.message ?? "Edge function returned a non-2xx status.";
      const parts = [`User: ${label}`, `ID: ${uid.slice(0, 8)}`];
      if (payload.raw_error && payload.raw_error !== friendly) parts.push(`Details: ${payload.raw_error}`);
      toast.error("Delete user failed", { description: parts.join("\n") });
      return;
    }
    toast.success(`User deleted: ${label}`);
    load();
  };

  const resendEmail = async (orderId: string) => {
    const tId = toast.loading("Sending ticket email\u2026");
    const { data, error } = await supabase.functions.invoke("send-ticket-email", { body: { order_id: orderId, force: true } });
    toast.dismiss(tId);
    if (error || (data as any)?.error) return toast.error((data as any)?.error ?? error!.message);
    if ((data as any)?.skipped) return toast.message((data as any).skipped);
    toast.success("Ticket email sent");
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    const { error } = await supabase.from("platform_settings").update({
      fee_percent: settingsRow.fee_percent,
      fee_flat_mwk: settingsRow.fee_flat_mwk,
      updated_at: new Date().toISOString(),
    }).eq("id", true);
    setSavingSettings(false);
    if (error) return toast.error(error.message);
    toast.success("Fee settings saved");
  };

  const sendBroadcast = async () => {
    if (!broadcastTitle.trim()) return toast.error("Title is required");
    setSendingBroadcast(true);
    try {
      await sendBroadcastNotification(broadcastTitle.trim(), broadcastBody.trim(), user!.id);
      toast.success("Notification sent to all users");
      setBroadcastTitle("");
      setBroadcastBody("");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send notification");
    } finally {
      setSendingBroadcast(false);
    }
  };

  const markPayoutPaid = async (id: string) => {
    const { error } = await supabase.from("vendor_payouts").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Payout marked as paid");
    load();
  };

  const filteredUsers = users.filter(
    (u) =>
      !search ||
      (u.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.phone ?? "").includes(search)
  );

  const navItem = (k: Tab, label: string, icon: any) => {
    const Icon = icon;
    const active = tab === k;
    return (
      <button
        onClick={() => setTab(k)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium transition-smooth ${
          active
            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
            : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
        }`}
      >
        <Icon className="w-4 h-4" /> {label}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur sticky top-0 z-50">
        <div className="px-4 md:px-6 h-16 flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-2 font-display font-extrabold text-lg">
            <Logo className="w-8 h-8" />
            <span>Tikiti<span className="text-accent">MW</span></span>
            <span className="text-[10px] uppercase tracking-widest text-accent font-bold border border-accent/30 rounded px-1.5 py-0.5 ml-1">
              Admin
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-800">
              <Link to="/"><ArrowLeft className="w-4 h-4" /> Back to site</Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-white hover:bg-slate-800"
              onClick={async () => { await signOut(); nav("/"); }}
            >
              <LogOut className="w-4 h-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row lg:items-start">
        <aside className="lg:w-64 lg:shrink-0 border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-900/80 lg:min-h-[calc(100vh-4rem)] lg:sticky lg:top-16 p-4">
          <div className="flex items-center gap-3 px-2 pb-4 mb-3 border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-gradient-hero grid place-items-center shadow-lg shadow-primary/40">
              <Crown className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-accent font-bold">Admin</div>
              <div className="font-display font-bold text-sm">Control center</div>
            </div>
          </div>
          <div className="space-y-1">
            {navItem("overview", "Overview", Activity)}
            {navItem("users", "Users & roles", Users)}
            <button
              onClick={() => setTab("applications")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium transition-smooth ${
                tab === "applications"
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              Vendor applications
              {vendorApps.length > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-amber-500 text-slate-900 px-1.5 py-0.5 rounded-full">
                  {vendorApps.length}
                </span>
              )}
            </button>
            {navItem("events", "All events", CalendarDays)}
            {navItem("payouts", "Vendor payouts", Wallet)}
            {navItem("settings", "Platform fees", SettingsIcon)}
            {navItem("audit", "Activity log", Activity)}
            {navItem("broadcast", "Send notification", Bell)}
          </div>
          <div className="mt-6 pt-4 border-t border-slate-800 px-2">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Quick links</div>
            <Link to="/scanner" className="block text-xs text-slate-400 hover:text-white py-1">Gate scanner</Link>
          </div>
        </aside>

        <main className="flex-1 min-w-0 px-4 md:px-8 py-8 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-accent font-bold">Platform</div>
              <h1 className="font-display font-extrabold text-3xl md:text-4xl">
                {tab === "overview" && "Operations overview"}
                {tab === "users" && "Users & roles"}
                {tab === "applications" && "Vendor applications"}
                {tab === "events" && "All events"}
                {tab === "payouts" && "Vendor payouts"}
                {tab === "settings" && "Platform fees"}
                {tab === "audit" && "Admin activity log"}
                {tab === "broadcast" && "Send notification"}
              </h1>
            </div>
            <Badge className="bg-accent/15 text-accent border border-accent/30">
              Signed in as admin
            </Badge>
          </div>

          {/* OVERVIEW */}
          {tab === "overview" && (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total revenue", value: formatMWK(stats.revenue), icon: DollarSign, accent: "from-red-600 to-rose-700" },
                  { label: "Tickets sold", value: stats.tickets, icon: Ticket, accent: "from-amber-500 to-orange-600" },
                  { label: "Active events", value: stats.activeEvents, icon: CalendarDays, accent: "from-emerald-600 to-teal-700" },
                  { label: "Users", value: stats.users, icon: Users, accent: "from-orange-500 to-amber-600" },
                ].map((s, i) => (
                  <div key={i} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
                    <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${s.accent} opacity-20 blur-2xl`} />
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${s.accent} grid place-items-center mb-4`}>
                      <s.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-xs text-slate-400">{s.label}</div>
                    <div className="font-display font-extrabold text-2xl mt-1">{s.value}</div>
                  </div>
                ))}
              </div>

              {vendorApps.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-display font-bold text-amber-200">
                      {vendorApps.length} vendor application{vendorApps.length !== 1 ? "s" : ""} awaiting review
                    </div>
                    <p className="text-sm text-slate-400 mt-1">Approve applicants to grant vendor access and send them a confirmation email.</p>
                  </div>
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setTab("applications")}>
                    Review now
                  </Button>
                </div>
              )}

              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                  { label: "Pending vendor apps", value: vendorApps.length, icon: ClipboardList, color: "text-amber-400" },
                  { label: "Active vendors", value: stats.vendorsCount, icon: Store },
                  { label: "Completed transactions", value: stats.paidOrders, icon: UserCheck, color: "text-emerald-400" },
                  { label: "Pending orders", value: stats.pendingOrders, icon: TrendingUp, color: "text-amber-400" },
                  { label: "Draft events", value: stats.draftEvents, icon: CalendarDays, color: "text-slate-400" },
                ].map((m, i) => (
                  <div key={i} className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3">
                    <m.icon className={`w-4 h-4 ${(m as any).color ?? "text-accent"}`} />
                    <div className="text-sm text-slate-300 flex-1">{m.label}</div>
                    <div className="font-display font-bold">{m.value}</div>
                  </div>
                ))}
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-800">
                  <div>
                    <div className="font-display font-bold">Complete transaction log</div>
                    <p className="text-xs text-slate-500 mt-0.5">Paid orders only \u2014 totals match revenue above</p>
                  </div>
                  <div className="text-sm font-display font-bold text-emerald-400">
                    {formatMWK(stats.revenue)} \u00b7 {paidTransactions.length} transactions
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-950/60 text-left text-slate-400 text-xs uppercase tracking-widest">
                      <tr>
                        <th className="p-4">Date</th>
                        <th className="p-4">Order</th>
                        <th className="p-4">Customer</th>
                        <th className="p-4">Payment</th>
                        <th className="p-4 text-right">Amount</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paidTransactions.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-500">
                            No completed transactions yet.
                          </td>
                        </tr>
                      )}
                      {paidTransactions.map((o) => (
                        <tr key={o.id} className="border-t border-slate-800">
                          <td className="p-4 text-slate-400 whitespace-nowrap">
                            {formatDate(o.paid_at ?? o.created_at)}
                          </td>
                          <td className="p-4 font-mono text-xs text-slate-500">{o.id.slice(0, 8)}</td>
                          <td className="p-4 text-slate-300">
                            <div className="truncate max-w-[200px]">{o.customer_name ?? "\u2014"}</div>
                            <div className="text-xs text-slate-500 truncate max-w-[200px]">
                              {o.customer_email ?? o.customer_id.slice(0, 8)}
                            </div>
                          </td>
                          <td className="p-4 text-slate-400 text-xs">
                            {o.payment_method?.replace(/_/g, " ") ?? o.payment_provider ?? "\u2014"}
                          </td>
                          <td className="p-4 text-right font-display font-bold">{formatMWK(o.total_mwk)}</td>
                          <td className="p-4 text-right">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-slate-400 hover:text-white hover:bg-slate-800"
                              title="Resend ticket email"
                              onClick={() => resendEmail(o.id)}
                            >
                              <Mail className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {paidTransactions.length > 0 && (
                      <tfoot>
                        <tr className="border-t border-slate-700 bg-slate-950/40">
                          <td colSpan={4} className="p-4 text-right text-xs uppercase tracking-widest text-slate-400 font-bold">
                            Total ({paidTransactions.length} paid)
                          </td>
                          <td className="p-4 text-right font-display font-extrabold text-lg text-emerald-400">
                            {formatMWK(stats.revenue)}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </>
          )}

          {/* VENDOR APPLICATIONS */}
          {tab === "applications" && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <div className="font-display font-bold">Pending vendor applications</div>
                <div className="text-xs text-slate-500">{vendorApps.length} pending</div>
              </div>
              {vendorApps.length === 0 ? (
                <div className="px-5 py-16 text-center text-sm text-slate-500">No pending applications right now.</div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {vendorApps.map((app) => {
                    const u = users.find((x) => x.id === app.user_id);
                    return (
                      <div key={app.id} className="px-5 py-4 flex flex-wrap items-center gap-4">
                        <div className="flex-1 min-w-[200px]">
                          <div className="font-semibold text-slate-100">{u?.full_name ?? "\u2014"}</div>
                          <div className="text-sm text-slate-400">{u?.email || app.user_id.slice(0, 8)}</div>
                          <div className="text-xs text-slate-500 mt-1">Applied {formatDate(app.created_at)}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-500 text-white"
                            disabled={reviewingApp === app.id}
                            onClick={() => reviewVendorApp(app.id, true)}
                          >
                            <CheckCircle2 className="w-4 h-4" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-200"
                            disabled={reviewingApp === app.id}
                            onClick={() => reviewVendorApp(app.id, false)}
                          >
                            <XCircle className="w-4 h-4" /> Reject
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* USERS */}
          {tab === "users" && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl">
              <div className="p-4 border-b border-slate-800 flex gap-3 items-center">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or phone\u2026"
                    className="pl-9 bg-slate-950 border-slate-800 text-slate-100"
                  />
                </div>
                <div className="text-xs text-slate-500">{filteredUsers.length} users</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-950/60 text-left text-slate-400 text-xs uppercase tracking-widest">
                    <tr>
                      <th className="p-4">Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Phone</th>
                      <th className="p-4">Roles</th>
                      <th className="p-4">Joined</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-t border-slate-800">
                        <td className="p-4 font-semibold text-slate-100">{u.full_name ?? "\u2014"}</td>
                        <td className="p-4 text-slate-300 break-all">{u.email || "\u2014"}</td>
                        <td className="p-4 text-slate-400">{u.phone ?? "\u2014"}</td>
                        <td className="p-4">
                          <div className="flex gap-1 flex-wrap">
                            {(u.roles.length > 1 ? u.roles.filter((r: string) => r !== "customer") : u.roles).map((r: string) => (
                              <span
                                key={r}
                                className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wide ${
                                  r === "admin"
                                    ? "bg-accent/20 text-accent"
                                    : r === "vendor"
                                    ? "bg-emerald-600/20 text-emerald-300"
                                    : "bg-slate-700/40 text-slate-300"
                                }`}
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-slate-400">{formatDate(u.created_at)}</td>
                        <td className="p-4 text-right space-x-1 whitespace-nowrap">
                          {!u.roles.includes("vendor") ? (
                            <Button size="sm" variant="outline" className="border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-200" onClick={() => grantRole(u.id, "vendor")}>+ Vendor</Button>
                          ) : (
                            <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800" onClick={() => revokeRole(u.id, "vendor")}>\u2013 Vendor</Button>
                          )}
                          {!u.roles.includes("admin") ? (
                            <Button size="sm" variant="outline" className="border-accent/50 bg-accent/10 hover:bg-accent/20 text-accent" onClick={() => grantRole(u.id, "admin")}>+ Admin</Button>
                          ) : (
                            <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800" onClick={() => revokeRole(u.id, "admin")}>\u2013 Admin</Button>
                          )}
                          {u.id !== user.id && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                              onClick={() => deleteUser(u.id, u.email || u.full_name || u.id.slice(0, 8))}
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* EVENTS */}
          {tab === "events" && (
            <div className="space-y-2">
              {dataLoading && (
                <div className="text-center py-16 text-slate-500 bg-slate-900/40 border border-slate-800 rounded-2xl flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> {t("admin.loading")}
                </div>
              )}
              {!dataLoading && events.length === 0 && (
                <div className="text-center py-16 text-slate-500 bg-slate-900/40 border border-slate-800 rounded-2xl">
                  {t("admin.emptyEvents")}
                </div>
              )}
              {!dataLoading && events.map((ev) => (
                <div key={ev.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex gap-4 items-center">
                  <div className="w-14 h-14 rounded-xl bg-slate-800 overflow-hidden">
                    {ev.banner_url ? (
                      <img src={ev.banner_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-red-600 to-amber-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold truncate">{ev.title}</div>
                    <div className="text-xs text-slate-400 truncate">
                      {formatDate(ev.starts_at)} \u00b7 {ev.venue}, {ev.city}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${
                      ev.status === "published"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : ev.status === "draft"
                        ? "bg-amber-500/15 text-amber-400"
                        : "bg-slate-700/40 text-slate-400"
                    }`}
                  >
                    {ev.status}
                  </span>
                  <Button asChild size="sm" variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800">
                    <Link to={`/events/${ev.id}`}>View</Link>
                  </Button>
                  {ev.status !== "cancelled" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-200"
                        onClick={() => toggleEventStatus(ev)}
                      >
                        {ev.status === "published" ? <><EyeOff className="w-4 h-4"/>Unpublish</> : <><Eye className="w-4 h-4"/>Publish</>}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-amber-700/50 bg-amber-600/10 hover:bg-amber-600/20 text-amber-300"
                        onClick={() => cancelEvent(ev)}
                      >
                        <Ban className="w-4 h-4"/>Cancel
                      </Button>
                    </>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                    onClick={() => removeEvent(ev.id, ev.title)}
                  >
                    <Trash2 className="w-4 h-4"/>
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* PAYOUTS */}
          {tab === "payouts" && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <div className="font-display font-bold">Vendor payouts</div>
                <div className="text-xs text-slate-500">{payouts.length} records</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-950/60 text-left text-slate-400 text-xs uppercase tracking-widest">
                    <tr>
                      <th className="p-4">Vendor</th>
                      <th className="p-4">Order</th>
                      <th className="p-4">Tickets</th>
                      <th className="p-4">Gross</th>
                      <th className="p-4">Fee</th>
                      <th className="p-4">Net to vendor</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.length === 0 && (
                      <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-slate-500">No payouts yet. They are created automatically when an order is paid.</td></tr>
                    )}
                    {payouts.map((p) => {
                      const vendorLabel = users.find((u) => u.id === p.vendor_id);
                      return (
                        <tr key={p.id} className="border-t border-slate-800">
                          <td className="p-4 text-slate-200">{vendorLabel?.full_name ?? vendorLabel?.email ?? p.vendor_id.slice(0, 8)}</td>
                          <td className="p-4 font-mono text-xs text-slate-400">{p.order_id.slice(0, 8)}</td>
                          <td className="p-4">{p.tickets_count}</td>
                          <td className="p-4">{formatMWK(p.gross_mwk)}</td>
                          <td className="p-4 text-amber-400">{formatMWK(p.fee_mwk)}</td>
                          <td className="p-4 font-display font-bold text-emerald-400">{formatMWK(p.net_mwk)}</td>
                          <td className="p-4">
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${p.status === "paid" ? "bg-emerald-500/15 text-emerald-400" : p.status === "cancelled" ? "bg-slate-700/40 text-slate-400" : "bg-amber-500/15 text-amber-400"}`}>{p.status}</span>
                          </td>
                          <td className="p-4 text-right">
                            {p.status === "pending" && (
                              <Button size="sm" variant="outline" className="border-emerald-700/50 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-300" onClick={() => markPayoutPaid(p.id)}>Mark paid</Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SETTINGS */}
          {tab === "settings" && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 max-w-xl">
              <div className="font-display font-bold mb-1">Platform fee configuration</div>
              <p className="text-sm text-slate-400 mb-5">Applied automatically to every paid order to compute vendor payouts.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">Fee percentage (%)</label>
                  <Input
                    type="number" step="0.1" min={0} max={100}
                    value={settingsRow.fee_percent}
                    onChange={(e) => setSettingsRow((s) => ({ ...s, fee_percent: Number(e.target.value) }))}
                    className="mt-1 bg-slate-950 border-slate-800 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">Flat fee per ticket (MWK)</label>
                  <Input
                    type="number" step="1" min={0}
                    value={settingsRow.fee_flat_mwk}
                    onChange={(e) => setSettingsRow((s) => ({ ...s, fee_flat_mwk: Number(e.target.value) }))}
                    className="mt-1 bg-slate-950 border-slate-800 text-slate-100"
                  />
                </div>
                <div className="text-xs text-slate-500 bg-slate-950/60 border border-slate-800 rounded-lg p-3">
                  Example: an order with 4 tickets totalling MWK 20,000 \u2192 fee = 20,000 \u00d7 {settingsRow.fee_percent}% + {settingsRow.fee_flat_mwk} \u00d7 4 = <span className="text-slate-300 font-bold">{formatMWK(20000 * settingsRow.fee_percent / 100 + settingsRow.fee_flat_mwk * 4)}</span>. Vendor receives <span className="text-emerald-400 font-bold">{formatMWK(20000 - (20000 * settingsRow.fee_percent / 100 + settingsRow.fee_flat_mwk * 4))}</span>.
                </div>
                <Button onClick={saveSettings} disabled={savingSettings} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Save className="w-4 h-4" /> {savingSettings ? "Saving\u2026" : "Save settings"}
                </Button>
              </div>
            </div>
          )}

          {/* AUDIT LOG */}
          {tab === "audit" && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-display font-bold">Admin activity log</div>
                  <p className="text-xs text-slate-500 mt-0.5">Latest 200 admin actions \u2014 user deletions, event deletions and more.</p>
                </div>
                <div className="text-xs text-slate-500">{auditLog.length} entries</div>
              </div>
              {auditLog.length === 0 ? (
                <div className="px-5 py-16 text-center text-sm text-slate-500">No admin actions recorded yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-950/60 text-left text-slate-400 text-xs uppercase tracking-widest">
                      <tr>
                        <th className="p-4">When</th>
                        <th className="p-4">Admin</th>
                        <th className="p-4">Action</th>
                        <th className="p-4">Target</th>
                        <th className="p-4">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLog.map((row) => {
                        const failed = String(row.action).endsWith("_failed");
                        return (
                          <tr key={row.id} className="border-t border-slate-800 align-top">
                            <td className="p-4 text-slate-400 whitespace-nowrap">{formatDate(row.created_at)}</td>
                            <td className="p-4 text-slate-300">
                              <div className="truncate max-w-[220px]">{row.actor_email ?? "\u2014"}</div>
                              <div className="text-xs text-slate-500 font-mono">{row.actor_id?.slice(0, 8) ?? "\u2014"}</div>
                            </td>
                            <td className="p-4">
                              <Badge className={failed
                                ? "bg-rose-500/15 text-rose-300 border border-rose-500/40"
                                : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"}>
                                {String(row.action).replace(/_/g, " ")}
                              </Badge>
                            </td>
                            <td className="p-4 text-slate-300">
                              <div className="truncate max-w-[220px]">{row.target_label ?? row.target_id ?? "\u2014"}</div>
                              <div className="text-xs text-slate-500 font-mono">
                                {row.target_type ?? "\u2014"} \u00b7 {row.target_id?.slice(0, 8) ?? "\u2014"}
                              </div>
                            </td>
                            <td className="p-4 text-xs text-slate-400 font-mono">
                              {row.details && Object.keys(row.details).length > 0
                                ? <pre className="whitespace-pre-wrap max-w-[280px]">{JSON.stringify(row.details, null, 0)}</pre>
                                : "\u2014"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* BROADCAST */}
          {tab === "broadcast" && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 max-w-xl">
              <div className="font-display font-bold mb-1">Send notification to all users</div>
              <p className="text-sm text-slate-400 mb-5">
                This is delivered to every user regardless of their event-notification preference.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">Title</label>
                  <Input
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="e.g. Scheduled maintenance tonight"
                    className="mt-1 bg-slate-950 border-slate-800 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">Message (optional)</label>
                  <textarea
                    value={broadcastBody}
                    onChange={(e) => setBroadcastBody(e.target.value)}
                    placeholder="Add more detail\u2026"
                    rows={4}
                    className="mt-1 w-full rounded-md bg-slate-950 border border-slate-800 text-slate-100 p-3 text-sm"
                  />
                </div>
                <Button
                  onClick={sendBroadcast}
                  disabled={sendingBroadcast}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Send className="w-4 h-4" /> {sendingBroadcast ? "Sending\u2026" : "Send to all users"}
                </Button>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;


