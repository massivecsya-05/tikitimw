// Initiates a PayChangu payment session for an existing pending order.
// Returns a checkout URL the client redirects the customer to.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.25.76";

const PAYCHANGU_BASE = "https://api.paychangu.com";

const InitBodySchema = z.object({
  order_id: z.string().uuid(),
  customer_email: z.string().email().max(320),
  return_url: z.string().url().max(2048),
});

const MAX_PROVIDER_ATTEMPTS = 3;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const PAYCHANGU_KEY = Deno.env.get("PAYCHANGU_SECRET_KEY");

    if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY || !PAYCHANGU_KEY) {
      console.error("initiate-payment missing required server configuration");
      return json({ error: "Payment service is not configured" }, 500);
    }

    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const token = auth.slice("Bearer ".length);
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;
    if (claimsError || !userId) return json({ error: "Unauthorized" }, 401);

    const parsed = InitBodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return json({ error: "Invalid payment details", fields: parsed.error.flatten().fieldErrors }, 400);
    }
    const body = parsed.data;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, customer_id, total_mwk, status")
      .eq("id", body.order_id)
      .maybeSingle();
    if (orderErr || !order) return json({ error: "order not found" }, 404);
    if (order.customer_id !== userId) return json({ error: "Forbidden" }, 403);
    if (order.status === "paid") return json({ error: "already paid" }, 409);

    // Persist customer email so the webhook can email tickets later
    await admin
      .from("orders")
      .update({ customer_email: body.customer_email })
      .eq("id", order.id);

    const txRef = `tikitimw-${order.id}`;
    const callbackUrl = `${SUPABASE_URL}/functions/v1/payment-webhook`;
    const payload = {
      amount: String(Number(order.total_mwk)),
      currency: "MWK",
      email: body.customer_email,
      tx_ref: txRef,
      callback_url: callbackUrl,
      return_url: body.return_url,
      customization: {
        title: "TikitiMW",
        description: `Order ${order.id.slice(0, 8)}`,
      },
      meta: { order_id: order.id, user_id: userId },
    };

    const { response: pcRes, data: pcData } = await requestPayChangu(PAYCHANGU_KEY, payload);
    if (!pcRes.ok) {
      console.error("paychangu_init_failed", pcRes.status, pcData);
      return json(
        { error: providerMessage(pcData) },
        502,
      );
    }

    // PayChangu responses commonly nest the URL under data.checkout_url
    const checkoutUrl =
      pcData?.data?.checkout_url ?? pcData?.checkout_url ?? pcData?.data?.authorization_url;
    if (!checkoutUrl) {
      console.error("paychangu_missing_url", pcData);
      return json({ error: "Provider returned no checkout URL", detail: pcData }, 502);
    }

    return json({ checkout_url: checkoutUrl, tx_ref: txRef });
  } catch (e) {
    console.error("initiate-payment unhandled", e);
    const unavailable = e instanceof Error && e.message === "PAYCHANGU_UNAVAILABLE";
    return json(
      { error: unavailable ? "Payment provider is temporarily unavailable. Please try again shortly." : "Could not start payment" },
      unavailable ? 503 : 500,
    );
  }
});

async function requestPayChangu(key: string, payload: unknown) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_PROVIDER_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(`${PAYCHANGU_BASE}/payment`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "User-Agent": "TikitiMW/1.0",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });
      const raw = await response.text();
      let data: Record<string, unknown> = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { message: raw.slice(0, 500) };
      }

      // Retry only transient provider failures. Validation/auth failures should
      // be returned immediately so the operator can correct the configuration.
      if (response.status < 500 || attempt === MAX_PROVIDER_ATTEMPTS) {
        return { response, data };
      }
      console.warn("paychangu_transient_response", { attempt, status: response.status });
    } catch (error) {
      lastError = error;
      console.warn("paychangu_connection_retry", {
        attempt,
        reason: error instanceof Error ? error.message : "connection error",
      });
      if (attempt === MAX_PROVIDER_ATTEMPTS) break;
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 500));
  }
  console.error("paychangu_unavailable_after_retries", lastError);
  throw new Error("PAYCHANGU_UNAVAILABLE");
}

function providerMessage(data: Record<string, unknown>) {
  const nested = typeof data.data === "object" && data.data ? data.data as Record<string, unknown> : undefined;
  const message = data.message ?? data.error ?? nested?.message;
  return typeof message === "string" && message.length <= 240
    ? message
    : "Payment provider rejected the request. Please try again.";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
