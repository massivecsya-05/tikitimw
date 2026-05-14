import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { formatMWK, formatDate } from "@/lib/format";
import {
  Users, CalendarDays, Ticket, DollarSign, Shield, Activity,
  AlertCircle, TrendingUp, Search, Crown, Store, UserCheck, ArrowUpRight,
  Eye, EyeOff, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Tab = "overview" | "users" | "events" | "audit";

const AdminDashboard = () => {
  const { user, roles, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState({
    users: 0, events: 0, tickets: 0, revenue: 0,
    pendingOrders: 0, paidOrders: 0, vendorsCount: 0, draftEvents: 0,
  });
  const [users, setUsers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const load = async () => {
    const [
      { data: profiles },
      { data: ev },
      { data: items },
      { data: rolesData },
      { data: orders },
      { data: auditData },
      emailsRes,
    ] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("events").select("*").order("created_at", { ascending: false }),
      supabase.from("order_items").select("quantity,unit_price_mwk"),
      supabase.from("user_roles").select("user_id,role"),
      supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("order_audit_log").select("*").order("created_at", { ascending: false }).limit(40),
      supabase.functions.invoke("admin-users", { body: { action: "list" } }),
    ]);

    const rolesByUser: Record<string, string[]> = {};
    rolesData?.forEach((r) => { (rolesByUser[r.user_id] ||= []).push(r.role); });
    const emails: Record<string, string> = (emailsRes as any)?.data?.emails ?? {};
    const enrichedUsers = (profiles ?? []).map((p) => ({ ...p, roles: rolesByUser[p.id] ?? [], email: emails[p.id] ?? "" }));
    setUsers(enrichedUsers);
    setEvents(ev ?? []);
    setAudit(auditData ?? []);
    setRecentOrders(orders?.slice(0, 8) ?? []);

    setStats({
      users: profiles?.length ?? 0,
      events: ev?.length ?? 0,
      tickets: items?.reduce((s, i) => s + i.quantity, 0) ?? 0,
      revenue: items?.reduce((s, i) => s + Number(i.unit_price_mwk) * i.quantity, 0) ?? 0,
      pendingOrders: orders?.filter((o) => o.status === "pending").length ?? 0,
      paidOrders: orders?.filter((o) => o.status === "paid").length ?? 0,
      vendorsCount: enrichedUsers.filter((u) => u.roles.includes("vendor")).length,
      draftEvents: ev?.filter((e: any) => e.status === "draft").length ?? 0,
    });
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

  const toggleEventStatus = async (ev: any) => {
    const next = ev.status === "published" ? "draft" : "published";
    const { error } = await supabase.from("events").update({ status: next }).eq("id", ev.id);
    if (error) return toast.error(error.message);
    toast.success(`Event ${next === "published" ? "published" : "unpublished"}`);
    load();
  };

  const deleteEvent = async (id: string) => {
    if (!confirm("Delete this event? This will also remove its tickets.")) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Event deleted");
    load();
  };

  const deleteUser = async (uid: string, label: string) => {
    if (!confirm(`Permanently delete user ${label}? This removes their account, profile, orders and tickets.`)) return;
    const { data, error } = await supabase.functions.invoke("admin-users", { body: { action: "delete", user_id: uid } });
    if (error || (data as any)?.error) return toast.error((data as any)?.error ?? error!.message);
    toast.success("User deleted");
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
              {navItem("events", "All events", CalendarDays)}
              {navItem("audit", "Audit log", AlertCircle)}
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
                  {tab === "events" && "All events"}
                  {tab === "audit" && "Audit log"}
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
                    { label: "Events", value: stats.events, icon: CalendarDays, accent: "from-indigo-500 to-violet-600" },
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

                {/* Secondary metrics + recent orders */}
                <div className="grid lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-1 space-y-3">
                    {[
                      { label: "Active vendors", value: stats.vendorsCount, icon: Store },
                      { label: "Paid orders", value: stats.paidOrders, icon: UserCheck, color: "text-emerald-400" },
                      { label: "Pending orders", value: stats.pendingOrders, icon: AlertCircle, color: "text-amber-400" },
                      { label: "Draft events", value: stats.draftEvents, icon: TrendingUp, color: "text-slate-400" },
                    ].map((m, i) => (
                      <div key={i} className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3">
                        <m.icon className={`w-4 h-4 ${(m as any).color ?? "text-violet-400"}`} />
                        <div className="text-sm text-slate-300 flex-1">{m.label}</div>
                        <div className="font-display font-bold">{m.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                      <div className="font-display font-bold">Recent orders</div>
                      <ArrowUpRight className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="divide-y divide-slate-800">
                      {recentOrders.length === 0 && (
                        <div className="px-5 py-10 text-center text-sm text-slate-500">No orders yet.</div>
                      )}
                      {recentOrders.map((o) => (
                        <div key={o.id} className="px-5 py-3 flex items-center gap-3 text-sm">
                          <div className="font-mono text-xs text-slate-500 w-20 truncate">{o.id.slice(0, 8)}</div>
                          <div className="flex-1 text-slate-300 truncate">
                            {o.customer_email ?? o.customer_id.slice(0, 8)}
                          </div>
                          <div
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                              o.status === "paid"
                                ? "bg-emerald-500/15 text-emerald-400"
                                : o.status === "pending"
                                ? "bg-amber-500/15 text-amber-400"
                                : "bg-slate-700/40 text-slate-400"
                            }`}
                          >
                            {o.status}
                          </div>
                          <div className="font-display font-bold">{formatMWK(o.total_mwk)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
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
                {events.length === 0 && (
                  <div className="text-center py-16 text-slate-500 bg-slate-900/40 border border-slate-800 rounded-2xl">
                    No events on the platform yet.
                  </div>
                )}
                {events.map((ev) => (
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
                      onClick={() => deleteEvent(ev.id)}
                    >
                      <Trash2 className="w-4 h-4"/>
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* AUDIT */}
            {tab === "audit" && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl">
                <div className="px-5 py-4 border-b border-slate-800 font-display font-bold">
                  Latest activity
                </div>
                <div className="divide-y divide-slate-800">
                  {audit.length === 0 && (
                    <div className="px-5 py-10 text-center text-sm text-slate-500">No activity yet.</div>
                  )}
                  {audit.map((a) => (
                    <div key={a.id} className="px-5 py-3 flex items-center gap-3 text-sm">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          a.action === "payment_confirmed"
                            ? "bg-emerald-400"
                            : a.action === "check_in"
                            ? "bg-violet-400"
                            : "bg-slate-500"
                        }`}
                      />
                      <div className="font-mono text-[11px] text-slate-500 w-32">
                        {new Date(a.created_at).toLocaleString()}
                      </div>
                      <div className="font-semibold text-slate-200 w-44">{a.action}</div>
                      <div className="text-xs text-slate-400 truncate flex-1">
                        order {a.order_id?.slice(0, 8)}
                      </div>
                    </div>
                  ))}
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
