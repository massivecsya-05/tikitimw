import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { deleteEvent } from "@/lib/api";
import { PageShell } from "@/components/PageShell";
import { formatMWK, formatDate } from "@/lib/format";
import {
  Users, CalendarDays, Ticket, DollarSign, Shield, Activity,
  TrendingUp, Search, Crown, Store, UserCheck,
  Eye, EyeOff, Trash2, Mail, Settings as SettingsIcon, Wallet, Save,
  ClipboardList, CheckCircle2, XCircle, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Tab = "overview" | "users" | "applications" | "events" | "payouts" | "settings" | "audit";

const AdminDashboard = () => {
  const { user, roles, loading } = useAuth();
  const { t } = useLanguage();
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
      <PageShell>
        <div className="container mx-auto py-32 text-center">
          <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="font-display text-3xl mb-2">Admin only</h1>
          <p className="text-muted-foreground">You don't have admin privileges on this account.</p>
        </div>
      </PageShell>
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
    const t = toast.loading(approve ? "Approving vendor…" : "Rejecting application…");
    const { data, error } = await supabase.functions.invoke("vendor-application", {
      body: { action: approve ? "approve" : "reject", application_id: applicationId },
    });
    toast.dismiss(t);
    setReviewingApp(null);
    if (error || (data as any)?.error) return toast.error((data as any)?.error ?? error!.message);
    toast.success(approve ? "Vendor approved — confirmation email sent" : "Application rejected");
    load();
  };

  const toggleEventStatus = async (ev: any) => {
    const next = ev.status === "published" ? "draft" : "published";
    const { error } = await supabase.from("events").update({ status: next }).eq("id", ev.id);
    if (error) return toast.error(error.message);
    toast.success(`Event ${next === "published" ? "published" : "unpublished"}`);
    load();
  };

  const removeEvent = async (id: string) => {
    if (!confirm("Delete this event? Ticket and order line items for this event will be removed.")) return;
    try {
      await deleteEvent(id);
      toast.success("Event deleted");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete event");
    }
  };

  const deleteUser = async (uid: string, label: string) => {
    if (!confirm(`Permanently delete user ${label}? This removes their account, profile, orders and tickets.`)) return;
    const { data, error } = await supabase.functions.invoke("admin-users", { body: { action: "delete", user_id: uid } });
    if (error || (data as any)?.error) return toast.error((data as any)?.error ?? error!.message);
    toast.success("User deleted");
    load();
  };

  const resendEmail = async (orderId: string) => {
    const t = toast.loading("Sending ticket email…");
    const { data, error } = await supabase.functions.invoke("send-ticket-email", { body: { order_id: orderId, force: true } });
    toast.dismiss(t);
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
            ? "bg-violet-600 text-white shadow-lg shadow-violet-600/30"
            : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
        }`}
      >
        <Icon className="w-4 h-4" /> {label}
      </button>
    );
  };

  return (
    <PageShell>
      {/* Distinct dark admin shell */}
      <div className="bg-slate-950 text-slate-100 min-h-[calc(100vh-4rem)]">
        <div className="container mx-auto px-4 py-8 grid lg:grid-cols-[260px_1fr] gap-6">
          {/* Sidebar */}
          <aside className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 h-fit lg:sticky lg:top-24">
            <div className="flex items-center gap-3 px-2 pb-4 mb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 grid place-items-center shadow-lg shadow-violet-600/40">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-violet-400 font-bold">Admin</div>
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
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-600/30"
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
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800 px-2">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Quick links</div>
              <Link to="/" className="block text-xs text-slate-400 hover:text-white py-1">← Back to site</Link>
              <Link to="/scanner" className="block text-xs text-slate-400 hover:text-white py-1">Gate scanner</Link>
            </div>
          </aside>

          {/* Main */}
          <main className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-widest text-violet-400 font-bold">Platform</div>
                <h1 className="font-display font-extrabold text-3xl md:text-4xl">
                  {tab === "overview" && "Operations overview"}
                  {tab === "users" && "Users & roles"}
                  {tab === "applications" && "Vendor applications"}
                  {tab === "events" && "All events"}
                  {tab === "payouts" && "Vendor payouts"}
                  {tab === "settings" && "Platform fees"}
                </h1>
              </div>
              <Badge className="bg-violet-600/20 text-violet-300 border border-violet-600/40">
                Signed in as admin
              </Badge>
            </div>

            {/* OVERVIEW */}
            {tab === "overview" && (
              <>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Total revenue", value: formatMWK(stats.revenue), icon: DollarSign, accent: "from-violet-500 to-fuchsia-600" },
                    { label: "Tickets sold", value: stats.tickets, icon: Ticket, accent: "from-fuchsia-500 to-pink-600" },
                    { label: "Active events", value: stats.activeEvents, icon: CalendarDays, accent: "from-indigo-500 to-violet-600" },
                    { label: "Users", value: stats.users, icon: Users, accent: "from-cyan-500 to-blue-600" },
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
                    <Button className="bg-violet-600 hover:bg-violet-500 text-white" onClick={() => setTab("applications")}>
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
                      <m.icon className={`w-4 h-4 ${(m as any).color ?? "text-violet-400"}`} />
                      <div className="text-sm text-slate-300 flex-1">{m.label}</div>
                      <div className="font-display font-bold">{m.value}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-800">
                    <div>
                      <div className="font-display font-bold">Complete transaction log</div>
                      <p className="text-xs text-slate-500 mt-0.5">Paid orders only — totals match revenue above</p>
                    </div>
                    <div className="text-sm font-display font-bold text-emerald-400">
                      {formatMWK(stats.revenue)} · {paidTransactions.length} transactions
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
                              <div className="truncate max-w-[200px]">{o.customer_name ?? "—"}</div>
                              <div className="text-xs text-slate-500 truncate max-w-[200px]">
                                {o.customer_email ?? o.customer_id.slice(0, 8)}
                              </div>
                            </td>
                            <td className="p-4 text-slate-400 text-xs">
                              {o.payment_method?.replace(/_/g, " ") ?? o.payment_provider ?? "—"}
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
                      const Field = ({ label, value }: { label: string; value?: string | null }) => (
                        <div>
                          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</div>
                          <div className="text-sm text-slate-200 break-words">{value || "—"}</div>
                        </div>
                      );
                      return (
                        <div key={app.id} className="px-5 py-5 space-y-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="font-display font-bold text-slate-100 text-lg">
                                {app.business_name || u?.full_name || "Unnamed vendor"}
                              </div>
                              <div className="text-sm text-slate-400">
                                {u?.email || app.contact_email || app.user_id.slice(0, 8)}
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                Applied {formatDate(app.created_at)} · Type: {app.business_type ?? "—"}
                              </div>
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
                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-950/40 border border-slate-800 rounded-xl p-4">
                            <Field label="Contact person" value={app.contact_name} />
                            <Field label="Phone" value={app.contact_phone} />
                            <Field label="Email" value={app.contact_email} />
                            <Field label="City" value={app.city} />
                            <Field label="Address" value={app.address} />
                            <Field label="Event types" value={app.event_types} />
                            <Field label="Business reg #" value={app.registration_number} />
                            <Field label="Tax ID / TPIN" value={app.tax_id} />
                            <Field label="Website / social" value={app.website_or_social} />
                            <Field label="ID document" value={app.id_document_type} />
                            <Field label="ID number" value={app.id_number} />
                            <div className="sm:col-span-2 lg:col-span-3">
                              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Description</div>
                              <p className="text-sm text-slate-200 whitespace-pre-wrap">{app.description || "—"}</p>
                            </div>
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
                      placeholder="Search by name or phone…"
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
                          <td className="p-4 font-semibold text-slate-100">{u.full_name ?? "—"}</td>
                          <td className="p-4 text-slate-300 break-all">{u.email || "—"}</td>
                          <td className="p-4 text-slate-400">{u.phone ?? "—"}</td>
                          <td className="p-4">
                            <div className="flex gap-1 flex-wrap">
                              {(u.roles.length > 1 ? u.roles.filter((r: string) => r !== "customer") : u.roles).map((r: string) => (
                                <span
                                  key={r}
                                  className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wide ${
                                    r === "admin"
                                      ? "bg-violet-600/20 text-violet-300"
                                      : r === "vendor"
                                      ? "bg-fuchsia-600/20 text-fuchsia-300"
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
                              <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800" onClick={() => revokeRole(u.id, "vendor")}>– Vendor</Button>
                            )}
                            {!u.roles.includes("admin") ? (
                              <Button size="sm" variant="outline" className="border-violet-700/50 bg-violet-600/10 hover:bg-violet-600/20 text-violet-300" onClick={() => grantRole(u.id, "admin")}>+ Admin</Button>
                            ) : (
                              <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800" onClick={() => revokeRole(u.id, "admin")}>– Admin</Button>
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
                        <div className="w-full h-full bg-gradient-to-br from-violet-600 to-fuchsia-700" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-bold truncate">{ev.title}</div>
                      <div className="text-xs text-slate-400 truncate">
                        {formatDate(ev.starts_at)} · {ev.venue}, {ev.city}
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
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-200"
                      onClick={() => toggleEventStatus(ev)}
                    >
                      {ev.status === "published" ? <><EyeOff className="w-4 h-4"/>Unpublish</> : <><Eye className="w-4 h-4"/>Publish</>}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                      onClick={() => removeEvent(ev.id)}
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
                    Example: an order with 4 tickets totalling MWK 20,000 → fee = 20,000 × {settingsRow.fee_percent}% + {settingsRow.fee_flat_mwk} × 4 = <span className="text-slate-300 font-bold">{formatMWK(20000 * settingsRow.fee_percent / 100 + settingsRow.fee_flat_mwk * 4)}</span>. Vendor receives <span className="text-emerald-400 font-bold">{formatMWK(20000 - (20000 * settingsRow.fee_percent / 100 + settingsRow.fee_flat_mwk * 4))}</span>.
                  </div>
                  <Button onClick={saveSettings} disabled={savingSettings} className="bg-violet-600 hover:bg-violet-500 text-white">
                    <Save className="w-4 h-4" /> {savingSettings ? "Saving…" : "Save settings"}
                  </Button>
                </div>
              </div>
            )}

          </main>
        </div>
      </div>
    </PageShell>
  );
};

export default AdminDashboard;
