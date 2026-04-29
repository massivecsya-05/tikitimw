import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Profile = () => {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => setProfile(data));
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth"/>;

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: fd.get("full_name") as string,
      phone: fd.get("phone") as string,
    }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
  };

  return (
    <PageShell>
      <div className="container mx-auto px-4 py-12 max-w-xl">
        <h1 className="font-display font-extrabold text-4xl mb-8">Your profile</h1>
        <form onSubmit={save} className="space-y-4 bg-gradient-card border border-border rounded-3xl p-8 shadow-card">
          <div><Label>Email</Label><Input value={user.email ?? ""} disabled className="h-11" /></div>
          <div><Label>Full name</Label><Input name="full_name" defaultValue={profile?.full_name ?? ""} className="h-11"/></div>
          <div><Label>Phone</Label><Input name="phone" defaultValue={profile?.phone ?? ""} placeholder="+265..." className="h-11"/></div>
          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
        </form>
      </div>
    </PageShell>
  );
};

export default Profile;
