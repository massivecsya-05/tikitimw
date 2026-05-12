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
import { Plus, Trash2, TrendingUp, Ticket, DollarSign, Eye, EyeOff, QrCode, Pencil } from "lucide-react";

type EventSales = { revenue: number; sold: number };

const VendorDashboard = () => {
  const { user, roles, loading } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [sales, setSales] = useState<Record<string, EventSales>>({});
  const [stats, setStats] = useState({ revenue: 0, sold: 0, eventsCount: 0 });
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
      const { data: items } = await supabase.from("order_items").select("quantity,unit_price_mwk,event_id").in("event_id", ids);
      const sold = items?.reduce((s, i) => s + i.quantity, 0) ?? 0;
      const revenue = items?.reduce((s, i) => s + Number(i.unit_price_mwk) * i.quantity, 0) ?? 0;
      const perEvent: Record<string, EventSales> = {};
      items?.forEach((i: any) => {
        const e = (perEvent[i.event_id] ||= { revenue: 0, sold: 0 });
        e.sold += i.quantity;
        e.revenue += Number(i.unit_price_mwk) * i.quantity;
      });
      setSales(perEvent);
      setStats({ revenue, sold, eventsCount: ev?.length ?? 0 });
    } else {
      setSales({});
      setStats({ revenue: 0, sold: 0, eventsCount: 0 });
    }
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
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
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
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
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
            <Button asChild variant="outline" size="lg"><Link to="/scanner"><QrCode/> Scanner</Link></Button>
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
                      <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>)}</SelectContent>
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
            { label: "Active events", value: stats.eventsCount, icon: TrendingUp, gradient: "bg-gradient-gold" },
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
                      <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>)}</SelectContent>
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
