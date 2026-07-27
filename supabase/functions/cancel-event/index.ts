// Cancels an event: calls the atomic cancel_event() RPC, then emails every
// customer who paid for a ticket to let them know, and that refunds are
// handled manually by the organiser (PayChangu has no refund API for
// mobile money transactions).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "missing auth" }, 401);

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const { event_id, reason } = await req.json();
    if (!event_id) return json({ error: "event_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Run cancellation as the calling user (RLS-authenticated) so ownership/role
    // checks inside cancel_event apply correctly.
    const asUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data, error } = await asUser.rpc("cancel_event", { p_event_id: event_id, p_reason: reason ?? null });
    if (error) return json({ error: "db error", detail: error.message }, 500);
    if (!(data as any)?.ok) return json({ ok: false, ...(data as any) }, 400);

    const affected: { order_id: string; customer_email: string | null; customer_name: string | null }[] =
      (data as any).affected_orders ?? [];

    const { data: event } = await admin.from("events").select("title, venue, city, starts_at").eq("id", event_id).maybeSingle();

    const apiKey = Deno.env.get("RESEND_API_KEY");
    let sent = 0;
    if (apiKey && event) {
      const from = Deno.env.get("EMAIL_FROM") ?? "TikitiMW <onboarding@resend.dev>";
      for (const o of affected) {
        if (!o.customer_email) continue;
        const html = `
          <div style="max-width:520px;margin:0 auto;padding:24px;font-family:system-ui">
            <h1 style="font-size:22px;margin:0 0 6px">This event has been cancelled</h1>
            <p style="color:#444">${escape(event.title)} on ${new Date(event.starts_at).toLocaleString()} at ${escape(event.venue)}, ${escape(event.city)} has been cancelled by the organiser.</p>
            ${reason ? `<p style="color:#666"><strong>Reason:</strong> ${escape(reason)}</p>` : ""}
            <p style="color:#444">Your ticket for order ${o.order_id.slice(0, 8)} is no longer valid for entry. The organiser will contact you directly to arrange a refund, since mobile money refunds can't be processed automatically.</p>
            <p style="color:#999;font-size:12px;margin-top:24px">If you have questions about your refund, please reply to this email or contact the organiser directly.</p>
          </div>
        `;
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ from, to: o.customer_email, subject: `${event.title} has been cancelled`, html }),
          });
          if (res.ok) sent++;
        } catch (e) {
          console.warn("cancel_notify_email_failed", o.order_id, e);
        }
      }
    }

    return json({ ok: true, affected_count: affected.length, emails_sent: sent });
  } catch (e) {
    console.error("cancel-event_error", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

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
