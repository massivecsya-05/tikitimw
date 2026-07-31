// Initiates a PayChangu sandbox payment session for an existing pending order.
// Returns a checkout URL the client redirects the customer to.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PAYCHANGU_BASE = "https://api.paychangu.com";

interface InitBody {
  order_id: string;
  customer_email: string;
  return_url: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const PAYCHANGU_KEY = Deno.env.get("PAYCHANGU_SECRET_KEY");

    if (!PAYCHANGU_KEY) {
      return json({ error: "PAYCHANGU_SECRET_KEY not configured" }, 500);
    }

    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "missing auth" }, 401);

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const body = (await req.json()) as Partial<InitBody>;
    if (!body.order_id || !body.customer_email || !body.return_url) {
      return json({ error: "order_id, customer_email and return_url are required" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, customer_id, total_mwk, status")
      .eq("id", body.order_id)
      .maybeSingle();
    if (orderErr || !order) return json({ error: "order not found" }, 404);
    if (order.customer_id !== user.id) return json({ error: "forbidden" }, 403);
    if (order.status === "paid") return json({ error: "already paid" }, 409);

    // Persist customer email so the webhook can email tickets later
    await admin
      .from("orders")
      .update({ customer_email: body.customer_email })
      .eq("id", order.id);

    const txRef = `tikitimw-${order.id}`;
    const payload = {
      amount: Number(order.total_mwk),
      currency: "MWK",
      email: body.customer_email,
      tx_ref: txRef,
      callback_url: body.return_url,
      return_url: body.return_url,
      customization: {
        title: "TikitiMW",
        description: `Order ${order.id.slice(0, 8)}`,
      },
      meta: { order_id: order.id, user_id: user.id },
    };

    const pcRes = await fetch(`${PAYCHANGU_BASE}/payment`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYCHANGU_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(25_000),
    });

    const pcData = await pcRes.json().catch(() => ({}));
    if (!pcRes.ok) {
      console.error("paychangu_init_failed", pcRes.status, pcData);
      return json(
        { error: "Payment provider error", detail: pcData },
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
    if (e instanceof DOMException && e.name === "TimeoutError") {
      return json({ error: "Payment provider timed out. Please try again." }, 504);
    }
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
