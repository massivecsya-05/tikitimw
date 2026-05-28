import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CATEGORIES, formatDate, formatMWK } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Trash2, TrendingUp, Ticket, DollarSign, Eye, EyeOff, QrCode, Pencil, Wallet, ScanLine } from "lucide-react";
import { PromoCodes } from "@/components/organiser/PromoCodes";
import { generateId } from "@/lib/uuid";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type EventSales = { revenue: number; sold: number };
type DailySale = { day: string; revenue: number; sold: number };
type TierBreakdown = { tier_id: string; tier_name: string; sold: number; remaining: number; revenue: number };

const VendorDashboard = () => {
  const { user, roles, loading } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [sales, setSales] = useState<Record<string, EventSales>>({});
  const [stats, setStats] = useState({ revenue: 0, sold: 0, eventsCount: 0, remaining: 0, checkInRate: 0 });
  const [payouts, setPayouts] = useState<any[]>([]);
  const [dailySales, setDailySales] = useState<DailySale[]>([]);
  const [tierBreakdown, setTierBreakdown] = useState<TierBreakdown[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [tiers, setTiers] = useState([{ name: "Regular", price: "", quantity: "" }]);
  const [creating, setCreating] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  // Edit dialog state
  const [editing, setEditing] = useState<any | null>(null);
  const [editBannerFile, setEditBannerFile] = useState<File | null>(null);
  const [editBannerPreview, setEditBannerPreview] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const onBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setBannerFile(f);
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    setBannerPreview(f ? URL.createObjectURL(f) : null);
  };

  const onEditBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setEditBannerFile(f);
    if (editBannerPreview) URL.revokeObjectURL(editBannerPreview);
    setEditBannerPreview(f ? URL.createObjectURL(f) : null);
  };

  const refresh = async () => {
    if (!user) return;
    const { data: ev } = await supabase.from("events").select("*").eq("vendor_id", user.id).order("created_at", { ascending: false });
    setEvents(ev ?? []);
    const ids = (ev ?? []).map(e => e.id);
    if (ids.length) {
      const { data: items } = await supabase.from("order_items").select("quantity,unit_price_mwk,event_id,tier_id,created_at").in("event_id", ids);
      const { data: tiersData } = await supabase.from("ticket_tiers").select("id,event_id,name,quantity,sold,quantity_sold,price_mwk").in("event_id", ids);
      const { data: ticketRows } = await (supabase as any).from("tickets").select("status,event_id,created_at,tier_id").in("event_id", ids);
      const { data: orderRows } = await supabase
        .from("order_items")
        .select("id,unit_price_mwk,event_id,orders!inner(id,customer_name,customer_email,status,created_at),ticket_tiers(name)")
        .in("event_id", ids)
        .order("created_at", { ascending: false })
        .limit(20);
      const sold = items?.reduce((s, i) => s + i.quantity, 0) ?? 0;
      const revenue = items?.reduce((s, i) => s + Number(i.unit_price_mwk) * i.quantity, 0) ?? 0;
      const perEvent: Record<string, EventSales> = {};
      items?.forEach((i: any) => {
        const e = (perEvent[i.event_id] ||= { revenue: 0, sold: 0 });
        e.sold += i.quantity;
        e.revenue += Number(i.unit_price_mwk) * i.quantity;
      });
      const remaining = (tiersData ?? []).reduce((sum, t: any) => {
        const soldQty = Number(t.quantity_sold ?? t.sold ?? 0);
        return sum + Math.max(0, Number(t.quantity) - soldQty);
      }, 0);
      const used = (ticketRows ?? []).filter((t: any) => t.status === "used").length;
      const validTickets = (ticketRows ?? []).filter((t: any) => t.status !== "cancelled").length;
      const checkInRate = validTickets > 0 ? (used / validTickets) * 100 : 0;

      const byDay = new Map<string, { revenue: number; sold: number }>();
      (items ?? []).forEach((it: any) => {
        const day = new Date(it.created_at ?? Date.now()).toISOString().slice(0, 10);
        const cur = byDay.get(day) ?? { revenue: 0, sold: 0 };
        cur.sold += Number(it.quantity);
        cur.revenue += Number(it.unit_price_mwk) * Number(it.quantity);
        byDay.set(day, cur);
      });
      const daily = Array.from(byDay.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, v]) => ({ day, revenue: v.revenue, sold: v.sold }));

      const breakdownByTier = new Map<string, TierBreakdown>();
      (tiersData ?? []).forEach((t: any) => {
        const soldQty = Number(t.quantity_sold ?? t.sold ?? 0);
        const rem = Math.max(0, Number(t.quantity) - soldQty);
        breakdownByTier.set(t.id, {
          tier_id: t.id,
          tier_name: t.name,
          sold: soldQty,
          remaining: rem,
          revenue: soldQty * Number(t.price_mwk),
        });
      });

      setSales(perEvent);
      setStats({ revenue, sold, eventsCount: ev?.length ?? 0, remaining, checkInRate });
      setDailySales(daily);
      setTierBreakdown(Array.from(breakdownByTier.values()).sort((a, b) => b.revenue - a.revenue));
      setRecentOrders(orderRows ?? []);
    } else {
      setSales({});
      setStats({ revenue: 0, sold: 0, eventsCount: 0, remaining: 0, checkInRate: 0 });
      setDailySales([]);
      setTierBreakdown([]);
      setRecentOrders([]);
    }
    const { data: po } = await supabase.from("vendor_payouts").select("*").eq("vendor_id", user.id).order("created_at", { ascending: false });
    setPayouts(po ?? []);
  };

  useEffect(() => { refresh(); }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;
  if (!roles.includes("vendor") && !roles.includes("admin"))
    return <PageShell><div className="container mx-auto px-4 py-20 text-center">
      <h1 className="font-display text-3xl mb-3">You're not a vendor yet</h1>
      <Button asChild variant="hero"><Link to="/become-vendor">Become a vendor</Link></Button>
    </div></PageShell>;

  const create = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setCreating(true);
    try {
      let banner_url: string | null = null;
      if (bannerFile) {
        if (bannerFile.size > 5 * 1024 * 1024) throw new Error("Banner must be 5MB or smaller");
        const ext = bannerFile.name.split(".").pop() || "jpg";
        const path = `${user.id}/${generateId()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("event-banners").upload(path, bannerFile, { contentType: bannerFile.type, upsert: false });
        if (upErr) throw upErr;
        banner_url = supabase.storage.from("event-banners").getPublicUrl(path).data.publicUrl;
      }
      const { data: ev, error } = await supabase.from("events").insert({
        vendor_id: user.id,
        title: fd.get("title") as string,
        description: fd.get("description") as string,
        category: fd.get("category") as any,
        venue: fd.get("venue") as string,
        city: fd.get("city") as string,
        starts_at: new Date(fd.get("starts_at") as string).toISOString(),
        banner_url,
        status: "published",
      }).select().single();
      if (error || !ev) throw error;
      const tierRows = tiers.filter(t => t.name && t.price && t.quantity).map(t => ({
        event_id: ev.id, name: t.name, price_mwk: Number(t.price), quantity: Number(t.quantity),
      }));
      if (tierRows.length) {
        const { error: e2 } = await supabase.from("ticket_tiers").insert(tierRows);
        if (e2) throw e2;
      }
      toast.success("Event published! 🎉");
      setOpen(false);
      setTiers([{ name: "Regular", price: "", quantity: "" }]);
      setBannerFile(null);
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
      setBannerPreview(null);
      refresh();
    } catch (err: any) { toast.error(err.message); }
    finally { setCreating(false); }
  };

  const openEdit = (ev: any) => {
    setEditing(ev);
    setEditBannerFile(null);
    if (editBannerPreview) URL.revokeObjectURL(editBannerPreview);
    setEditBannerPreview(null);
  };

  const closeEdit = () => {
    setEditing(null);
    setEditBannerFile(null);
    if (editBannerPreview) URL.revokeObjectURL(editBannerPreview);
    setEditBannerPreview(null);
  };

  const saveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData(e.currentTarget);
    setSavingEdit(true);
    try {
      let banner_url = editing.banner_url ?? null;
      if (editBannerFile) {
        if (editBannerFile.size > 5 * 1024 * 1024) throw new Error("Banner must be 5MB or smaller");
        const ext = editBannerFile.name.split(".").pop() || "jpg";
        const path = `${user.id}/${generateId()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("event-banners").upload(path, editBannerFile, { contentType: editBannerFile.type, upsert: false });
        if (upErr) throw upErr;
        banner_url = supabase.storage.from("event-banners").getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase.from("events").update({
        title: fd.get("title") as string,
        description: fd.get("description") as string,
        category: fd.get("category") as any,
        venue: fd.get("venue") as string,
        city: fd.get("city") as string,
        starts_at: new Date(fd.get("starts_at") as string).toISOString(),
        banner_url,
      }).eq("id", editing.id);
      if (error) throw error;
      toast.success("Event updated");
      closeEdit();
      refresh();
    } catch (err: any) { toast.error(err.message); }
    finally { setSavingEdit(false); }
  };

  const toLocalInput = (iso: string) => {
    const d = new Date(iso);
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
  };

  const toggleStatus = async (ev: any) => {
    const next = ev.status === "published" ? "draft" : "published";
    await supabase.from("events").update({ status: next }).eq("id", ev.id);
    toast.success(`Event ${next === "published" ? "published" : "unpublished"}`);
    refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this event? This will also delete its tickets.")) return;
    await supabase.from("events").delete().eq("id", id);
    toast.success("Event deleted");
    refresh();
  };

  return (
    <PageShell>
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-xs uppercase tracking-widest text-primary font-bold mb-2">Vendor</div>
            <h1 className="font-display font-extrabold text-4xl md:text-5xl">Your event hub</h1>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="lg" className="min-h-12"><Link to="/organiser/scan"><QrCode/> Scanner</Link></Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button variant="hero" size="lg"><Plus/> Create event</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="font-display text-2xl">Create new event</DialogTitle></DialogHeader>
              <form onSubmit={create} className="space-y-4">
                <div><Label>Title *</Label><Input name="title" required /></div>
                <div><Label>Description</Label><Textarea name="description" rows={3} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Category *</Label>
                    <Select name="category" defaultValue="concert" required>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>{CATEGORIES.filter(c => c.value !== "all").map(c => <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Date & Time *</Label><Input name="starts_at" type="datetime-local" required /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Venue *</Label><Input name="venue" required /></div>
                  <div><Label>City *</Label><Input name="city" required defaultValue="Lilongwe" /></div>
                </div>
                <div>
                  <Label>Banner image</Label>
                  <div className="mt-1 flex items-center gap-3">
                    <label className="flex-1 cursor-pointer border-2 border-dashed border-border rounded-xl px-4 py-3 text-sm text-muted-foreground hover:border-primary/50 hover:bg-muted/30 transition-smooth">
                      {bannerFile ? bannerFile.name : "Click to upload (JPG/PNG, max 5MB)"}
                      <input type="file" accept="image/*" className="hidden" onChange={onBannerChange} />
                    </label>
                    {bannerPreview && (
                      <img src={bannerPreview} alt="Banner preview" className="w-20 h-20 object-cover rounded-xl border border-border" />
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2"><Label>Ticket tiers</Label>
                    <Button type="button" size="sm" variant="outline" onClick={() => setTiers([...tiers, { name: "", price: "", quantity: "" }])}><Plus className="w-4 h-4"/></Button>
                  </div>
                  <div className="space-y-2">
                    {tiers.map((t, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2">
                        <Input className="col-span-5" placeholder="Tier name (e.g. VIP)" value={t.name} onChange={e => { const c = [...tiers]; c[i].name = e.target.value; setTiers(c); }} />
                        <Input className="col-span-3" type="number" placeholder="Price MK" value={t.price} onChange={e => { const c = [...tiers]; c[i].price = e.target.value; setTiers(c); }} />
                        <Input className="col-span-3" type="number" placeholder="Qty" value={t.quantity} onChange={e => { const c = [...tiers]; c[i].quantity = e.target.value; setTiers(c); }} />
                        <Button type="button" size="icon" variant="ghost" className="col-span-1" onClick={() => setTiers(tiers.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4"/></Button>
                      </div>
                    ))}
                  </div>
                </div>
                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={creating}>{creating ? "Creating..." : "Publish event"}</Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          {[
            { label: "Revenue", value: formatMWK(stats.revenue), icon: DollarSign, gradient: "bg-gradient-hero" },
            { label: "Tickets sold", value: stats.sold, icon: Ticket, gradient: "bg-gradient-emerald" },
            { label: "Tickets remaining", value: stats.remaining, icon: TrendingUp, gradient: "bg-gradient-gold" },
            { label: "Check-in rate", value: `${stats.checkInRate.toFixed(1)}%`, icon: ScanLine, gradient: "bg-gradient-emerald" },
          ].map((s, i) => (
            <div key={i} className="p-6 rounded-2xl bg-gradient-card border border-border shadow-card flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${s.gradient} grid place-items-center text-primary-foreground`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
                <div className="font-display font-extrabold text-2xl">{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-10">
          <div className="rounded-2xl border border-border bg-gradient-card p-5 shadow-card">
            <h3 className="font-display font-bold mb-4">Daily sales (MWK)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailySales}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                  <XAxis dataKey="day" tickFormatter={(d) => d.slice(5)} />
                  <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v: any) => formatMWK(v)} />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-gradient-card p-5 shadow-card overflow-x-auto">
            <h3 className="font-display font-bold mb-4">Tier breakdown</h3>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="pb-2">Tier</th>
                  <th className="pb-2">Sold</th>
                  <th className="pb-2">Remaining</th>
                  <th className="pb-2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {tierBreakdown.map((row) => (
                  <tr key={row.tier_id} className="border-t border-border">
                    <td className="py-2">{row.tier_name}</td>
                    <td className="py-2">{row.sold}</td>
                    <td className="py-2">{row.remaining}</td>
                    <td className="py-2 font-semibold">{formatMWK(row.revenue)}</td>
                  </tr>
                ))}
                {tierBreakdown.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground">No tier sales yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          <Button asChild variant="outline" className="min-h-12 gap-2">
            <Link to="/organiser/scan">
              <ScanLine className="w-4 h-4" /> Gate check-in scanner
            </Link>
          </Button>
        </div>

        {user && <div className="mb-10"><PromoCodes vendorId={user.id} /></div>}

        <div className="mb-10 rounded-2xl border border-border bg-gradient-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border font-display font-bold">Recent orders</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground bg-muted/30">
                <tr>
                  <th className="p-3">Buyer</th>
                  <th className="p-3">Tier</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o: any) => (
                  <tr key={o.id} className="border-t border-border">
                    <td className="p-3">{o.orders?.customer_name ?? o.orders?.customer_email ?? "Guest"}</td>
                    <td className="p-3">{o.ticket_tiers?.name ?? "Tier"}</td>
                    <td className="p-3">{formatMWK(o.unit_price_mwk ?? 0)}</td>
                    <td className="p-3">{o.orders?.status}</td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-5 text-center text-muted-foreground">No recent orders.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payouts */}
        {payouts.length > 0 && (
          <div className="mb-10 rounded-2xl border border-border bg-gradient-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3">
              <Wallet className="w-4 h-4 text-primary" />
              <div className="font-display font-bold flex-1">Earnings & payouts</div>
              <div className="text-xs text-muted-foreground">
                Pending: <span className="font-bold text-foreground">{formatMWK(payouts.filter(p => p.status === "pending").reduce((s, p) => s + Number(p.net_mwk), 0))}</span>
                {" · "}Paid: <span className="font-bold text-foreground">{formatMWK(payouts.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.net_mwk), 0))}</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground bg-muted/30">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Order</th>
                    <th className="p-3">Tickets</th>
                    <th className="p-3">Gross</th>
                    <th className="p-3">Platform fee</th>
                    <th className="p-3">You receive</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map(p => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="p-3 text-muted-foreground">{formatDate(p.created_at)}</td>
                      <td className="p-3 font-mono text-xs">{p.order_id.slice(0, 8)}</td>
                      <td className="p-3">{p.tickets_count}</td>
                      <td className="p-3">{formatMWK(p.gross_mwk)}</td>
                      <td className="p-3 text-amber-600">−{formatMWK(p.fee_mwk)}</td>
                      <td className="p-3 font-display font-bold text-secondary">{formatMWK(p.net_mwk)}</td>
                      <td className="p-3"><span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${p.status === "paid" ? "bg-secondary/15 text-secondary" : p.status === "cancelled" ? "bg-muted text-muted-foreground" : "bg-amber-500/15 text-amber-600"}`}>{p.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
              To withdraw your pending balance, contact the platform admin. Payouts are processed manually via bank or mobile money.
            </div>
          </div>
        )}

        <Tabs defaultValue="all">
          <TabsList><TabsTrigger value="all">All events</TabsTrigger><TabsTrigger value="published">Published</TabsTrigger><TabsTrigger value="draft">Drafts</TabsTrigger></TabsList>
          {["all", "published", "draft"].map(s => (
            <TabsContent key={s} value={s}>
              <div className="space-y-3">
                {events.filter(e => s === "all" || e.status === s).map(ev => {
                  const es = sales[ev.id] ?? { revenue: 0, sold: 0 };
                  return (
                    <div key={ev.id} className="bg-gradient-card border border-border rounded-2xl p-4 flex flex-wrap gap-4 items-center">
                      <div className="w-16 h-16 rounded-xl bg-muted overflow-hidden shrink-0">
                        {ev.banner_url ? <img src={ev.banner_url} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full bg-gradient-sunset"/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-display font-bold truncate">{ev.title}</div>
                        <div className="text-sm text-muted-foreground">{formatDate(ev.starts_at)} · {ev.venue}, {ev.city}</div>
                        <div className="mt-1 flex gap-3 text-xs">
                          <span className="inline-flex items-center gap-1 text-muted-foreground"><Ticket className="w-3 h-3"/> <span className="font-semibold text-foreground">{es.sold}</span> sold</span>
                          <span className="inline-flex items-center gap-1 text-muted-foreground"><DollarSign className="w-3 h-3"/> <span className="font-semibold text-foreground">{formatMWK(es.revenue)}</span></span>
                        </div>
                      </div>
                      <div className={`text-xs font-bold px-2 py-1 rounded-md ${ev.status === "published" ? "bg-secondary/10 text-secondary" : "bg-muted text-muted-foreground"}`}>{ev.status}</div>
                      <Button size="sm" variant="outline" onClick={() => openEdit(ev)}><Pencil className="w-4 h-4"/>Edit</Button>
                      <Button size="sm" variant="outline" onClick={() => toggleStatus(ev)}>
                        {ev.status === "published" ? <><EyeOff className="w-4 h-4"/>Unpublish</> : <><Eye className="w-4 h-4"/>Publish</>}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(ev.id)}><Trash2 className="w-4 h-4 text-destructive"/></Button>
                    </div>
                  );
                })}
                {events.filter(e => s === "all" || e.status === s).length === 0 && (
                  <div className="text-center py-16 text-muted-foreground">No events yet.</div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Edit dialog */}
        <Dialog open={!!editing} onOpenChange={(o) => !o && closeEdit()}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display text-2xl">Edit event</DialogTitle></DialogHeader>
            {editing && (
              <form onSubmit={saveEdit} className="space-y-4">
                <div><Label>Title *</Label><Input name="title" required defaultValue={editing.title} /></div>
                <div><Label>Description</Label><Textarea name="description" rows={3} defaultValue={editing.description ?? ""} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Category *</Label>
                    <Select name="category" defaultValue={editing.category} required>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>{CATEGORIES.filter(c => c.value !== "all").map(c => <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Date & Time *</Label><Input name="starts_at" type="datetime-local" required defaultValue={toLocalInput(editing.starts_at)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Venue *</Label><Input name="venue" required defaultValue={editing.venue} /></div>
                  <div><Label>City *</Label><Input name="city" required defaultValue={editing.city} /></div>
                </div>
                <div>
                  <Label>Banner image</Label>
                  <div className="mt-1 flex items-center gap-3">
                    <label className="flex-1 cursor-pointer border-2 border-dashed border-border rounded-xl px-4 py-3 text-sm text-muted-foreground hover:border-primary/50 hover:bg-muted/30 transition-smooth">
                      {editBannerFile ? editBannerFile.name : "Click to replace banner (JPG/PNG, max 5MB)"}
                      <input type="file" accept="image/*" className="hidden" onChange={onEditBannerChange} />
                    </label>
                    {(editBannerPreview || editing.banner_url) && (
                      <img src={editBannerPreview ?? editing.banner_url} alt="Banner preview" className="w-20 h-20 object-cover rounded-xl border border-border" />
                    )}
                  </div>
                </div>
                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={savingEdit}>{savingEdit ? "Saving..." : "Save changes"}</Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PageShell>
  );
};

export default VendorDashboard;
