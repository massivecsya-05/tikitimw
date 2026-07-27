import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

import { supabase } from "@/integrations/supabase/client";
import { deleteEvent, ensureOrderTickets } from "@/lib/api";

describe("api helpers", () => {
  it("deleteEvent calls delete_event RPC", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null });
    await deleteEvent("event-uuid");
    expect(supabase.rpc).toHaveBeenCalledWith("delete_event", { p_event_id: "event-uuid" });
  });

  it("ensureOrderTickets invokes send-ticket-email with tickets_only", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { ok: true, tickets_count: 2 },
      error: null,
    });
    const result = await ensureOrderTickets("order-uuid");
    expect(supabase.functions.invoke).toHaveBeenCalledWith("send-ticket-email", {
      body: { order_id: "order-uuid", tickets_only: true },
    });
    expect(result.tickets_count).toBe(2);
  });
});
