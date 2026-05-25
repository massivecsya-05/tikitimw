// Receives PayChangu payment notifications. Verifies signature when a
// webhook secret is configured, then idempotently confirms the order.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, signature, verif-hash",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const raw = await req.text();
  const secret = Deno.env.get("PAYCHANGU_WEBHOOK_SECRET");
  if (secret) {
    // PayChangu sends signature in `signature` header (HMAC-SHA512 of raw body)
    const provided = req.headers.get("signature") ?? req.headers.get("verif-hash");
    if (!provided) {
      console.warn("webhook_missing_signature");
      return json({ error: "missing signature" }, 400);
    }
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(raw));
    const expected = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    if (expected !== provided.toLowerCase()) {
      console.warn("webhook_bad_signature");
      return json({ error: "bad signature" }, 400);
    }
  } else {
    console.warn("PAYCHANGU_WEBHOOK_SECRET not set — accepting unverified webhook (sandbox only)");
  }

  let payload: any;
  try { payload = JSON.parse(raw); } catch {
    return json({ error: "invalid json" }, 400);
  }

  const eventType: string = payload.event_type ?? payload.event ?? payload.status ?? "";
  const status: string = (payload.status ?? payload.data?.status ?? "").toLowerCase();
  const isSuccess =
    /charge\.success|payment\.success|success|successful/i.test(eventType) ||
    status === "success" || status === "successful";

  if (!isSuccess) {
    return json({ ok: true, ignored: true, reason: "non-success event" });
  }

  const txRef: string | undefined =
    payload.tx_ref ?? payload.data?.tx_ref ?? payload.reference ?? payload.data?.reference;
  const providerRef: string =
    payload.reference ?? payload.data?.reference ?? payload.id ?? payload.data?.id ?? txRef ?? "";
  const orderId: string | undefined =
    payload.meta?.order_id ?? payload.data?.meta?.order_id ??
    (txRef?.startsWith("tikitimw-") ? txRef.slice("tikitimw-".length) : undefined);

  if (!orderId) {
    console.error("webhook_missing_order_id", payload);
    return json({ error: "missing order_id" }, 422);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await admin.rpc("confirm_payment", {
    p_order_id: orderId,
    p_provider_ref: providerRef,
    p_provider: "paychangu",
  });

  if (error) {
    console.error("confirm_payment_rpc_failed", error);
    return json({ error: "db error", detail: error.message }, 500);
  }

  // Fire-and-forget: email tickets if email infra is later configured
  try {
    await admin.functions.invoke("send-ticket-email", { body: { order_id: orderId } });
  } catch (e) {
    console.warn("send-ticket-email invoke skipped:", (e as Error).message);
  }

  return json({ ok: true, result: data });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
