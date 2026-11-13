import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stripeRequest } from "@lib/stripe/api";

describe("stripeRequest key check", () => {
  const original = process.env.STRIPE_SECRET_KEY;
  const fetchMock = vi.fn(async () => new Response("{}"));

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    process.env.STRIPE_SECRET_KEY = original;
    vi.unstubAllGlobals();
    fetchMock.mockClear();
  });

  it.each(["sk_live_x", "sk_test_x", "rk_live_x", "rk_test_x"])("accepts %s", async (key) => {
    process.env.STRIPE_SECRET_KEY = key;
    await stripeRequest("/checkout/sessions/cs_1");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each(["pk_live_x", "whsec_x", "https://dashboard.stripe.com"])("rejects %s", async (key) => {
    process.env.STRIPE_SECRET_KEY = key;
    await expect(stripeRequest("/checkout/sessions/cs_1")).rejects.toThrow("invalid format");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
