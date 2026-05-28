// Sends ticket QR codes to the customer after a successful payment.
// Uses Resend if RESEND_API_KEY is configured; otherwise logs and exits cleanly
// so the rest of the checkout flow continues to work.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import QRCode from "https://esm.sh/qrcode@1.5.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { order_id, force } = await req.json();
    if (!order_id) return json({ error: "order_id required" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Load order + items + event/tier metadata
    const { data: order, error: oErr } = await admin
      .from("orders")
      .select("id, customer_id, customer_email, customer_name, customer_phone, total_mwk, status, email_sent_at")
      .eq("id", order_id)
      .single();
    if (oErr || !order) return json({ error: "order not found" }, 404);
    if (order.status !== "paid") return json({ ok: false, error: "order not paid yet" }, 422);
    if (order.email_sent_at && !force) return json({ ok: true, skipped: "already sent" });

    // Resolve recipient email: prefer order.customer_email, else auth user email
    let to = order.customer_email;
    if (!to) {
      const { data: u } = await admin.auth.admin.getUserById(order.customer_id);
      to = u?.user?.email ?? null;
    }
    if (!to) return json({ ok: false, error: "no recipient email" }, 422);

    const { data: items } = await admin
      .from("order_items")
      .select("id, qr_code, quantity, unit_price_mwk, tier_id, event_id")
      .eq("order_id", order_id);
    if (!items || items.length === 0) return json({ ok: false, error: "no items" }, 422);

    // Ensure a ticket row exists per purchased ticket.
    const { data: existingTickets } = await admin
      .from("tickets")
      .select("id")
      .eq("order_id", order_id);

    if (!existingTickets || existingTickets.length === 0) {
      const insertRows: any[] = [];
      for (const it of items) {
        const qty = Math.max(1, Number(it.quantity ?? 1));
        for (let i = 0; i < qty; i++) {
          const ticketId = crypto.randomUUID();
          const qrDataUrl = await QRCode.toDataURL(ticketId, { width: 320, margin: 1 });
          insertRows.push({
            id: ticketId,
            order_id: order.id,
            event_id: it.event_id,
            tier_id: it.tier_id,
            buyer_name: order.customer_name ?? null,
            buyer_email: to,
            buyer_phone: order.customer_phone ?? null,
            qr_code: qrDataUrl,
            status: "unused",
          });
        }
      }
      const { error: insertErr } = await admin.from("tickets").insert(insertRows);
      if (insertErr) return json({ ok: false, error: insertErr.message }, 500);
    }

    const eventIds = [...new Set(items.map((i) => i.event_id))];
    const tierIds = [...new Set(items.map((i) => i.tier_id))];
    const [{ data: events }, { data: tiers }] = await Promise.all([
      admin.from("events").select("id, title, venue, city, starts_at").in("id", eventIds),
      admin.from("ticket_tiers").select("id, name").in("id", tierIds),
    ]);
    const eventMap = new Map((events ?? []).map((e) => [e.id, e]));
    const tierMap = new Map((tiers ?? []).map((t) => [t.id, t]));

    const { data: tickets } = await admin
      .from("tickets")
      .select("id, qr_code, status, tier_id, event_id, created_at")
      .eq("order_id", order_id)
      .order("created_at", { ascending: true });
    if (!tickets || tickets.length === 0) return json({ ok: false, error: "tickets not generated" }, 500);

    // Build inline QR images
    const ticketBlocks: string[] = [];
    const attachments: { filename: string; content: string }[] = [];
    for (const tk of tickets) {
      const ev = eventMap.get(tk.event_id);
      const tier = tierMap.get(tk.tier_id);
      const dataUrl = tk.qr_code;
      const cid = `qr-${tk.id}`;
      attachments.push({
        filename: `${cid}.png`,
        content: dataUrl.split(",")[1],
      });
      ticketBlocks.push(`
        <div style="border:1px solid #e5e5e5;border-radius:14px;padding:18px;margin:14px 0;font-family:system-ui">
          <div style="font-size:18px;font-weight:800">${escape(ev?.title ?? "Event")}</div>
          <div style="color:#666;font-size:13px;margin-top:2px">
            ${ev ? new Date(ev.starts_at).toLocaleString() : ""} · ${escape(ev?.venue ?? "")}, ${escape(ev?.city ?? "")}
          </div>
          <div style="margin-top:8px;font-weight:600">${escape(tier?.name ?? "Ticket")}</div>
          <div style="text-align:center;margin-top:12px">
            <img src="${dataUrl}" alt="QR" style="width:200px;height:200px" />
            <div style="font-family:monospace;font-size:11px;color:#999;margin-top:6px">${tk.id}</div>
          </div>
        </div>
      `);
    }

    const html = `
      <div style="max-width:560px;margin:0 auto;padding:24px;font-family:system-ui">
        <h1 style="font-size:24px;margin:0 0 6px">Your TikitiMW tickets 🎟️</h1>
        <p style="color:#666;margin:0 0 18px">Show the QR code at the gate to check in.</p>
        ${ticketBlocks.join("")}
        <p style="color:#999;font-size:12px;margin-top:24px">Order ${order.id}</p>
      </div>
    `;

    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      console.warn("RESEND_API_KEY not set — skipping email send");
      return json({ ok: true, skipped: "email not configured" });
    }

    const from = Deno.env.get("EMAIL_FROM") ?? "TikitiMW <onboarding@resend.dev>";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: "Your TikitiMW tickets",
        html,
        attachments,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("resend_failed", res.status, body);
      return json({ ok: false, error: "email provider error", detail: body }, 502);
    }

    await admin.from("orders").update({ email_sent_at: new Date().toISOString() }).eq("id", order_id);
    return json({ ok: true, sent_to: to });
  } catch (e) {
    console.error("send-ticket-email_error", e);
    return json({ error: (e as Error).message }, 500);
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
