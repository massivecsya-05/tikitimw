// Vendor application: notify admin on submit, approve/reject with email to applicant.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;
    const applicationId = body.application_id as string | undefined;

    if (action === "notify_admin") {
      if (!applicationId) return json({ error: "application_id required" }, 400);

      const { data: app, error: aErr } = await admin
        .from("vendor_applications")
        .select("id, user_id, status, created_at")
        .eq("id", applicationId)
        .single();
      if (aErr || !app) return json({ error: "application not found" }, 404);
      if (app.user_id !== user.id) return json({ error: "forbidden" }, 403);
      if (app.status !== "pending") return json({ ok: true, skipped: "not pending" });

      const [{ data: profile }, { data: authUser }] = await Promise.all([
        admin.from("profiles").select("full_name, phone").eq("id", app.user_id).maybeSingle(),
        admin.auth.admin.getUserById(app.user_id),
      ]);

      const applicantEmail = authUser?.user?.email ?? "unknown";
      const applicantName = profile?.full_name ?? applicantEmail;
      const adminEmail = Deno.env.get("ADMIN_EMAIL");
      const siteUrl = Deno.env.get("SITE_URL") ?? "http://localhost:8080";

      const html = `
        <div style="max-width:560px;margin:0 auto;padding:24px;font-family:system-ui">
          <h1 style="font-size:22px;margin:0 0 12px">New vendor application</h1>
          <p style="color:#666;margin:0 0 16px">A customer requested to become a vendor on TikitiMW.</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr><td style="padding:8px 0;color:#888">Name</td><td style="font-weight:600">${escape(applicantName)}</td></tr>
            <tr><td style="padding:8px 0;color:#888">Email</td><td>${escape(applicantEmail)}</td></tr>
            <tr><td style="padding:8px 0;color:#888">Phone</td><td>${escape(profile?.phone ?? "—")}</td></tr>
            <tr><td style="padding:8px 0;color:#888">Applied</td><td>${new Date(app.created_at).toLocaleString()}</td></tr>
          </table>
          <p style="margin-top:20px">
            <a href="${escape(siteUrl)}/admin" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">
              Review in admin dashboard
            </a>
          </p>
        </div>
      `;

      if (adminEmail) {
        await sendEmail(adminEmail, "New vendor application — TikitiMW", html);
      } else {
        console.warn("ADMIN_EMAIL not set — skipping admin notification");
      }

      return json({ ok: true });
    }

    if (action === "approve" || action === "reject") {
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!isAdmin) return json({ error: "forbidden" }, 403);
      if (!applicationId) return json({ error: "application_id required" }, 400);

      const { data: app, error: aErr } = await admin
        .from("vendor_applications")
        .select("id, user_id, status")
        .eq("id", applicationId)
        .single();
      if (aErr || !app) return json({ error: "application not found" }, 404);
      if (app.status !== "pending") return json({ error: "application already reviewed" }, 422);

      const now = new Date().toISOString();

      if (action === "approve") {
        const { error: roleErr } = await admin
          .from("user_roles")
          .insert({ user_id: app.user_id, role: "vendor" });
        if (roleErr && !roleErr.message.includes("duplicate")) {
          return json({ error: roleErr.message }, 500);
        }

        await admin.from("vendor_applications").update({
          status: "approved",
          reviewed_at: now,
          reviewed_by: user.id,
        }).eq("id", applicationId);

        const [{ data: profile }, { data: authUser }] = await Promise.all([
          admin.from("profiles").select("full_name").eq("id", app.user_id).maybeSingle(),
          admin.auth.admin.getUserById(app.user_id),
        ]);
        const to = authUser?.user?.email;
        const name = profile?.full_name ?? "there";
        const siteUrl = Deno.env.get("SITE_URL") ?? "http://localhost:8080";

        if (to) {
          const html = `
            <div style="max-width:560px;margin:0 auto;padding:24px;font-family:system-ui">
              <h1 style="font-size:24px;margin:0 0 8px">You're now a vendor! 🎉</h1>
              <p style="color:#666;margin:0 0 18px">Hi ${escape(name)}, your TikitiMW account has been approved as a vendor. You can create events and sell tickets right away.</p>
              <a href="${escape(siteUrl)}/vendor" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">
                Open vendor dashboard
              </a>
              <p style="color:#999;font-size:12px;margin-top:24px">Questions? Reply to this email or contact support.</p>
            </div>
          `;
          await sendEmail(to, "Your vendor account is active — TikitiMW", html);
        }

        return json({ ok: true, status: "approved" });
      }

      await admin.from("vendor_applications").update({
        status: "rejected",
        reviewed_at: now,
        reviewed_by: user.id,
        note: (body.note as string) ?? null,
      }).eq("id", applicationId);

      return json({ ok: true, status: "rejected" });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    console.error("vendor-application_error", e);
    return json({ error: (e as Error).message }, 500);
  }
});

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — skipping email");
    return;
  }
  const from = Deno.env.get("EMAIL_FROM") ?? "TikitiMW <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("resend_failed", res.status, body);
    throw new Error("email provider error");
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
