// Actively verifies a PayChangu transaction (used by the success-callback page)
// so orders move out of "pending" even if the webhook never fires.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PAYCHANGU_BASE = "https://api.paychangu.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const PAYCHANGU_KEY = Deno.env.get("PAYCHANGU_SECRET_KEY");
    if (!PAYCHANGU_KEY) return json({ error: "PAYCHANGU_SECRET_KEY not configured" }, 500);

    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "missing auth" }, 401);

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const { order_id, tx_ref } = await req.json();
    if (!order_id) return json({ error: "order_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: order } = await admin.from("orders")
      .select("id, customer_id, status").eq("id", order_id).maybeSingle();
    if (!order) return json({ error: "order not found" }, 404);
    if (order.customer_id !== user.id) return json({ error: "forbidden" }, 403);
    if (order.status === "paid") return json({ ok: true, status: "paid", already: true });

    const ref = tx_ref ?? `tikitimw-${order_id}`;
    const pcRes = await fetch(`${PAYCHANGU_BASE}/verify-payment/${ref}`, {
      headers: { Authorization: `Bearer ${PAYCHANGU_KEY}` },
    });
    const pc = await pcRes.json().catch(() => ({}));
    const status = String(pc?.status ?? pc?.data?.status ?? "").toLowerCase();
    const ok = pcRes.ok && (status === "success" || status === "successful");

    if (!ok) {
      return json({ ok: false, status: status || "unknown", provider: pc });
    }

    const providerRef =
      pc?.data?.reference ?? pc?.data?.tx_ref ?? pc?.reference ?? ref;

    const { error: rpcErr } = await admin.rpc("confirm_payment", {
      p_order_id: order_id,
      p_provider_ref: providerRef,
      p_provider: "paychangu",
    });
    if (rpcErr) return json({ error: "db error", detail: rpcErr.message }, 500);

    try {
      await admin.functions.invoke("send-ticket-email", { body: { order_id } });
    } catch (_) { /* email infra optional */ }

    return json({ ok: true, status: "paid" });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
