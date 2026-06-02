import { describe, expect, it } from "vitest";
import { detectMobileNetwork, paymentErrorMessage, getEventBadge } from "@/lib/format";

describe("detectMobileNetwork", () => {
  it("detects TNM prefixes", () => {
    expect(detectMobileNetwork("+265881234567")).toBe("tnm_mpamba");
  });

  it("detects Airtel prefixes", () => {
    expect(detectMobileNetwork("+265999123456")).toBe("airtel_money");
  });

  it("returns null for unknown", () => {
    expect(detectMobileNetwork("+265111111111")).toBeNull();
  });
});

describe("paymentErrorMessage", () => {
  it("maps known codes", () => {
    expect(paymentErrorMessage("cancelled")).toContain("cancelled");
  });

  it("falls back for unknown", () => {
    expect(paymentErrorMessage("xyz")).toContain("Something went wrong");
  });
});

describe("getEventBadge", () => {
  it("marks sold out", () => {
    expect(getEventBadge({ min_price: 1000, total_capacity: 10, total_remaining: 0 })).toBe("sold_out");
  });

  it("marks free", () => {
    expect(getEventBadge({ min_price: 0, total_capacity: 10, total_remaining: 5 })).toBe("free");
  });
});
