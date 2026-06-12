/**
 * Route-handler tests for the push API. The SSRF *algorithm* is covered by
 * test/public-fetch-safety.test.ts; this file covers the route *wiring* —
 * the parts a helper test can't reach:
 *
 * - subscribe: fail-closed when the SSRF guard rejects OR throws (must not
 *   persist), and the https-only / shape validation.
 * - send: the auth gate, VAPID gating, the same-origin relative-path guard
 *   for notification urls, and the send-time filter that drops internal-IP
 *   endpoints (exercised against the REAL isInternalHost, not a stub).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const db = vi.hoisted(() => ({
  upsertSubscription: vi.fn(),
  deleteSubscription: vi.fn(),
  getAllSubscriptions: vi.fn(),
  deleteSubscriptions: vi.fn(),
}));
vi.mock("@lib/db/push-subscriptions", () => db);

const safety = vi.hoisted(() => ({ isSafePublicFetchUrl: vi.fn() }));
vi.mock("@utils/public-fetch-safety", () => safety);

const webpush = vi.hoisted(() => ({
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn(),
}));
vi.mock("web-push", () => ({ default: webpush }));

// Real isInternalHost / normalizeHost are intentionally NOT mocked — the
// send-route filter is the thing under test.
import { POST as subscribePOST } from "../../app/api/push/subscribe/route";
import { POST as sendPOST } from "../../app/api/push/send/route";

const originalEnv = { ...process.env };

const VALID_ENDPOINT = "https://fcm.googleapis.com/fcm/send/abc123";
const VALID_KEYS = { p256dh: "a".repeat(80), auth: "b".repeat(20) };

function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  safety.isSafePublicFetchUrl.mockResolvedValue(true);
  db.upsertSubscription.mockResolvedValue(undefined);
  db.getAllSubscriptions.mockResolvedValue([]);
  db.deleteSubscriptions.mockResolvedValue(undefined);
  webpush.sendNotification.mockResolvedValue(undefined);

  process.env = { ...originalEnv };
  process.env.PUSH_SEND_SECRET = "test-push-secret";
  process.env.VAPID_PUBLIC_KEY = "test-public-key";
  process.env.VAPID_PRIVATE_KEY = "test-private-key";
  process.env.VAPID_EMAIL = "push@example.com";
});

afterEach(() => {
  process.env = originalEnv;
});

const AUTH = { authorization: "Bearer test-push-secret" };

describe("POST /api/push/subscribe", () => {
  it("rejects a malformed JSON body with 400 and does not persist", async () => {
    const res = await subscribePOST(
      postJson("https://app.test/api/push/subscribe", "{not-json"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("INVALID_BODY");
    expect(db.upsertSubscription).not.toHaveBeenCalled();
  });

  it("rejects a non-https endpoint at the schema before the SSRF check", async () => {
    const res = await subscribePOST(
      postJson("https://app.test/api/push/subscribe", {
        endpoint: "http://fcm.googleapis.com/fcm/send/abc",
        keys: VALID_KEYS,
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("INVALID_BODY");
    expect(safety.isSafePublicFetchUrl).not.toHaveBeenCalled();
    expect(db.upsertSubscription).not.toHaveBeenCalled();
  });

  it("rejects an unsafe endpoint (guard returns false) without persisting", async () => {
    safety.isSafePublicFetchUrl.mockResolvedValue(false);
    const res = await subscribePOST(
      postJson("https://app.test/api/push/subscribe", {
        endpoint: VALID_ENDPOINT,
        keys: VALID_KEYS,
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("INVALID_ENDPOINT");
    expect(db.upsertSubscription).not.toHaveBeenCalled();
  });

  it("fails closed (500) and does not persist when the SSRF guard throws", async () => {
    safety.isSafePublicFetchUrl.mockRejectedValue(new Error("dns lookup blew up"));
    const res = await subscribePOST(
      postJson("https://app.test/api/push/subscribe", {
        endpoint: VALID_ENDPOINT,
        keys: VALID_KEYS,
      }),
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("INTERNAL");
    expect(db.upsertSubscription).not.toHaveBeenCalled();
  });

  it("persists a valid, safe subscription", async () => {
    const res = await subscribePOST(
      postJson("https://app.test/api/push/subscribe", {
        endpoint: VALID_ENDPOINT,
        keys: VALID_KEYS,
      }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(db.upsertSubscription).toHaveBeenCalledWith(
      VALID_ENDPOINT,
      VALID_KEYS.p256dh,
      VALID_KEYS.auth,
    );
  });
});

describe("POST /api/push/send", () => {
  const validBody = { title: "Hi", body: "There" };

  it("returns 401 without the bearer secret and never sends", async () => {
    const res = await sendPOST(
      postJson("https://app.test/api/push/send", validBody),
    );
    expect(res.status).toBe(401);
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it("returns 401 when PUSH_SEND_SECRET is not configured", async () => {
    delete process.env.PUSH_SEND_SECRET;
    const res = await sendPOST(
      postJson("https://app.test/api/push/send", validBody, AUTH),
    );
    expect(res.status).toBe(401);
  });

  it("returns 503 when VAPID is not configured", async () => {
    delete process.env.VAPID_PUBLIC_KEY;
    const res = await sendPOST(
      postJson("https://app.test/api/push/send", validBody, AUTH),
    );
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("VAPID_NOT_CONFIGURED");
  });

  it("rejects a protocol-relative notification url with 400", async () => {
    const res = await sendPOST(
      postJson(
        "https://app.test/api/push/send",
        { ...validBody, url: "//evil.example.com" },
        AUTH,
      ),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("INVALID_BODY");
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it("filters internal-IP endpoints and only sends to public ones", async () => {
    db.getAllSubscriptions.mockResolvedValue([
      { endpoint: "https://127.0.0.1/fcm/send/x", p256dh: "k1", auth: "a1" },
      { endpoint: "https://192.168.1.10/fcm/send/y", p256dh: "k2", auth: "a2" },
      { endpoint: VALID_ENDPOINT, p256dh: "k3", auth: "a3" },
    ]);

    const res = await sendPOST(
      postJson("https://app.test/api/push/send", validBody, AUTH),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, sent: 1 });
    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
    expect(webpush.sendNotification.mock.calls[0][0].endpoint).toBe(
      VALID_ENDPOINT,
    );
  });
});
