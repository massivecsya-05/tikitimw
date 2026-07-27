import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: uerr } = await userClient.auth.getUser();
    if (uerr || !user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(url, service);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = body.action ?? "list";

    if (action === "list") {
      const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
      if (error) throw error;
      const emails: Record<string, string> = {};
      data.users.forEach((u: any) => { emails[u.id] = u.email ?? ""; });
      return json({ emails });
    }

    if (action === "delete") {
      const targetId = body.user_id as string;
      if (!targetId) return json({ error: "user_id required" }, 400);
      if (targetId === user.id) return json({ error: "You cannot delete your own admin account." }, 400);

      // Snapshot target details for the audit log
      const { data: targetAuth } = await admin.auth.admin.getUserById(targetId);
      const { data: targetProfile } = await admin.from("profiles").select("full_name, phone").eq("id", targetId).maybeSingle();
      const targetEmail = targetAuth?.user?.email ?? null;
      const targetLabel = targetProfile?.full_name || targetEmail || targetId;

      const { error } = await admin.auth.admin.deleteUser(targetId);
      if (error) {
        // Log the failed attempt too for visibility
        await admin.from("admin_activity_log").insert({
          actor_id: user.id,
          actor_email: user.email ?? null,
          action: "user_delete_failed",
          target_type: "user",
          target_id: targetId,
          target_label: targetLabel,
          details: { error: error.message, code: (error as any).code ?? null, status: (error as any).status ?? null },
        });
        const raw = error.message ?? String(error);
        // Friendlier messages for common causes
        let friendly = raw;
        if (/foreign key|violates/i.test(raw)) {
          friendly = "Cannot delete user ÔÇö related records still reference them. Reassign or remove those first.";
        } else if (/not.?found|no.?user/i.test(raw)) {
          friendly = "User not found ÔÇö they may already be deleted. Refresh and try again.";
        } else if (/permission|forbidden|unauthor/i.test(raw)) {
          friendly = "Permission denied by the auth service.";
        }
        return json({
          error: friendly,
          operation: "delete_user",
          target_id: targetId,
          target_email: targetEmail,
          raw_error: raw,
        }, 500);
      }

      await admin.from("admin_activity_log").insert({
        actor_id: user.id,
        actor_email: user.email ?? null,
        action: "user_deleted",
        target_type: "user",
        target_id: targetId,
        target_label: targetLabel,
        details: { email: targetEmail },
      });

      return json({ ok: true, deleted_id: targetId, deleted_email: targetEmail });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e: any) {
    return json({ error: String(e?.message ?? e), operation: "admin_users" }, 500);
  }
});
