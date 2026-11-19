import { afterEach, expect, it, vi } from "vitest";
import { DELETE, POST } from "../../app/api/push/subscribe/route";

const dns = vi.hoisted(() => ({ lookup: vi.fn() }));
vi.mock("node:dns/promises", () => dns);

const db = vi.hoisted(() => ({
  upsertSubscription: vi.fn(),
  deleteSubscription: vi.fn(),
}));
vi.mock("@lib/db/push-subscriptions", () => db);

function request(ip: string, body: unknown, method = "POST") {
  return new Request("https://app.test/api/push/subscribe", {
    method,
    headers: { "content-type": "application/json", "x-real-ip": ip },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.useRealTimers();
});

it("limits registration attempts per IP for one minute without blocking unsubscribe", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  dns.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  const client = "192.0.2.1";
  const endpoint = "https://push.example.test/subscription";
  const subscription = { endpoint, keys: { p256dh: "test-key", auth: "test-auth" } };

  for (let i = 0; i < 10; i++) {
    expect((await POST(request(client, {}))).status).toBe(400);
  }

  vi.advanceTimersByTime(35_500);
  const registration = request(client, subscription);
  const blocked = await POST(registration);
  expect(blocked.status).toBe(429);
  expect(await blocked.json()).toEqual({ ok: false, error: "RATE_LIMITED" });
  expect(blocked.headers.get("Cache-Control")).toBe("no-store");
  expect(blocked.headers.get("Retry-After")).toBe("25");
  expect(registration.bodyUsed).toBe(false);
  expect(dns.lookup).not.toHaveBeenCalled();
  expect(db.upsertSubscription).not.toHaveBeenCalled();

  expect((await POST(request("192.0.2.2", subscription))).status).toBe(200);
  expect((await DELETE(request(client, { endpoint }, "DELETE"))).status).toBe(200);
  expect(db.deleteSubscription).toHaveBeenCalledWith(endpoint);

  vi.advanceTimersByTime(24_500);
  expect((await POST(request(client, subscription))).status).toBe(200);
  expect(db.upsertSubscription).toHaveBeenCalledTimes(2);
});
