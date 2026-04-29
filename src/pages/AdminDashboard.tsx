import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { formatMWK, formatDate } from "@/lib/format";
import { Users, CalendarDays, Ticket, DollarSign, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const AdminDashboard = () => {
  const { user, roles, loading } = useAuth();
  const [stats, setStats] = useState({ users: 0, events: 0, tickets: 0, revenue: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  const load = async () => {
    const [{ data: profiles }, { data: ev }, { data: items }, { data: rolesData }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("events").select("*").order("created_at", { ascending: false }),
      supabase.from("order_items").select("quantity,unit_price_mwk"),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    const rolesByUser: Record<string, string[]> = {};
    rolesData?.forEach(r => { (rolesByUser[r.user_id] ||= []).push(r.role); });
    setUsers((profiles ?? []).map(p => ({ ...p, roles: rolesByUser[p.id] ?? [] })));
    setEvents(ev ?? []);
    setStats({
      users: profiles?.length ?? 0,
      events: ev?.length ?? 0,
      tickets: items?.reduce((s, i) => s + i.quantity, 0) ?? 0,
      revenue: items?.reduce((s, i) => s + Number(i.unit_price_mwk) * i.quantity, 0) ?? 0,
    });
  };

  useEffect(() => { if (roles.includes("admin")) load(); }, [roles]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;
  if (!roles.includes("admin")) return <PageShell><div className="container mx-auto py-20 text-center"><h1 className="font-display text-3xl">Admin only</h1></div></PageShell>;

  const grantRole = async (uid: string, role: "vendor" | "admin") => {
    const { error } = await supabase.from("user_roles").insert({ user_id: uid, role });
    if (error && !error.message.includes("duplicate")) return toast.error(error.message);
    toast.success(`Granted ${role}`); load();
  };

  const revokeRole = async (uid: string, role: "vendor" | "admin") => {
    await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", role);
    toast.success(`Revoked ${role}`); load();
  };

  return (
    <PageShell>
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-emerald grid place-items-center"><Shield className="w-5 h-5 text-secondary-foreground"/></div>
          <div className="text-xs uppercase tracking-widest text-secondary font-bold">Admin Console</div>
        </div>
        <h1 className="font-display font-extrabold text-4xl md:text-5xl mb-10">Platform overview</h1>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Total revenue", value: formatMWK(stats.revenue), icon: DollarSign, g: "bg-gradient-hero" },
            { label: "Tickets sold", value: stats.tickets, icon: Ticket, g: "bg-gradient-gold" },
            { label: "Events", value: stats.events, icon: CalendarDays, g: "bg-gradient-emerald" },
            { label: "Users", value: stats.users, icon: Users, g: "bg-primary" },
          ].map((s, i) => (
            <div key={i} className="p-6 rounded-2xl bg-gradient-card border border-border shadow-card">
              <div className={`w-11 h-11 rounded-xl ${s.g} grid place-items-center text-primary-foreground mb-4`}>
                <s.icon className="w-5 h-5"/>
              </div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
              <div className="font-display font-extrabold text-3xl">{s.value}</div>
            </div>
          ))}
        </div>

        <Tabs defaultValue="users">
          <TabsList><TabsTrigger value="users">Users & roles</TabsTrigger><TabsTrigger value="events">All events</TabsTrigger></TabsList>
          <TabsContent value="users">
            <div className="rounded-2xl border border-border overflow-hidden bg-gradient-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left"><tr>
                  <th className="p-4">Name</th><th className="p-4">Phone</th><th className="p-4">Roles</th><th className="p-4">Joined</th><th className="p-4 text-right">Actions</th>
                </tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-t border-border">
                      <td className="p-4 font-semibold">{u.full_name ?? "—"}</td>
                      <td className="p-4 text-muted-foreground">{u.phone ?? "—"}</td>
                      <td className="p-4"><div className="flex gap-1 flex-wrap">{u.roles.map((r: string) => <span key={r} className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary font-semibold">{r}</span>)}</div></td>
                      <td className="p-4 text-muted-foreground">{formatDate(u.created_at)}</td>
                      <td className="p-4 text-right space-x-1">
                        {!u.roles.includes("vendor")
                          ? <Button size="sm" variant="outline" onClick={() => grantRole(u.id, "vendor")}>+ Vendor</Button>
                          : <Button size="sm" variant="ghost" onClick={() => revokeRole(u.id, "vendor")}>- Vendor</Button>}
                        {!u.roles.includes("admin")
                          ? <Button size="sm" variant="outline" onClick={() => grantRole(u.id, "admin")}>+ Admin</Button>
                          : <Button size="sm" variant="ghost" onClick={() => revokeRole(u.id, "admin")}>- Admin</Button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
          <TabsContent value="events">
            <div className="space-y-2">
              {events.map(ev => (
                <div key={ev.id} className="bg-gradient-card border border-border rounded-2xl p-4 flex gap-4 items-center">
                  <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden">
                    {ev.banner_url ? <img src={ev.banner_url} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full bg-gradient-sunset"/>}
                  </div>
                  <div className="flex-1">
                    <div className="font-display font-bold">{ev.title}</div>
                    <div className="text-sm text-muted-foreground">{formatDate(ev.starts_at)} · {ev.venue}, {ev.city}</div>
                  </div>
                  <div className={`text-xs font-bold px-2 py-1 rounded-md ${ev.status === "published" ? "bg-secondary/10 text-secondary" : "bg-muted text-muted-foreground"}`}>{ev.status}</div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
};

export default AdminDashboard;
