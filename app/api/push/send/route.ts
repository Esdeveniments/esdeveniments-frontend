import { NextResponse } from "next/server";
import { z } from "zod";
import webpush from "web-push";
import { captureException } from "@sentry/nextjs";
import {
  deleteSubscriptions,
  getAllSubscriptions,
} from "@lib/db/push-subscriptions";
import { isInternalHost } from "@config/index";
import { normalizeHost } from "@utils/host-validation";

// Only relevant on Vercel preview deploys (production runs a persistent
// Node server on Coolify where route duration is unbounded). Keeps the
// chunked broadcast loop from being killed at the default timeout.
export const maxDuration = 60;

const NO_STORE = { "Cache-Control": "no-store" } as const;

/**
 * Same-origin relative path: must start with a single "/" ("//host" is a
 * protocol-relative URL and would let a notification open an external site).
 * The service worker also enforces same-origin as defense in depth.
 */
const relativePath = (field: string) =>
  z
    .string()
    .max(2048)
    .refine((v) => v.startsWith("/") && !v.startsWith("//"), {
      message: `${field} must be a same-origin relative path`,
    });

const SendSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(300),
  url: relativePath("url").optional().default("/"),
  icon: relativePath("icon")
    .optional()
    .default("/static/icons/icon-192x192.png"),
});

function getVapidConfig(): {
  publicKey: string;
  privateKey: string;
  email: string;
} | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL;
  if (!publicKey || !privateKey || !email) return null;
  return { publicKey, privateKey, email };
}

export async function POST(request: Request) {
  // Dedicated secret — deliberately NOT REVALIDATE_SECRET. Reusing the
  // revalidation credential would let a leaked cache-purge token broadcast
  // push notifications to every subscriber (and vice versa). If unset, the
  // route stays safely disabled (401 for everyone).
  const authHeader = request.headers.get("authorization");
  const secret = process.env.PUSH_SEND_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401, headers: NO_STORE },
    );
  }

  const vapid = getVapidConfig();
  if (!vapid) {
    return NextResponse.json(
      { ok: false, error: "VAPID_NOT_CONFIGURED" },
      { status: 503, headers: NO_STORE },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "INVALID_BODY" },
      { status: 400, headers: NO_STORE },
    );
  }

  const parsed = SendSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "INVALID_BODY" },
      { status: 400, headers: NO_STORE },
    );
  }

  webpush.setVapidDetails(
    `mailto:${vapid.email}`,
    vapid.publicKey,
    vapid.privateKey,
  );

  const subscriptions = await getAllSubscriptions();
  if (subscriptions.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 }, { headers: NO_STORE });
  }

  // SSRF re-filter: https only, and reject literal internal/loopback IPs.
  // The full DNS-resolving check (getPublicFetchSafety) runs once at
  // subscribe time so bad endpoints never persist; repeating DNS lookups
  // for every subscription on every broadcast would be wasteful.
  const validSubscriptions = subscriptions.filter((sub) => {
    try {
      const url = new URL(sub.endpoint);
      if (url.protocol !== "https:") return false;
      // isInternalHost catches loopback/private/link-local literals and
      // known internal hostnames (no DNS resolution at send time).
      return !isInternalHost(normalizeHost(url.hostname));
    } catch {
      return false;
    }
  });

  if (validSubscriptions.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 }, { headers: NO_STORE });
  }

  const payload = JSON.stringify({
    title: parsed.data.title,
    body: parsed.data.body,
    url: parsed.data.url,
    icon: parsed.data.icon,
  });

  // Add concurrency control with chunking to avoid overwhelming push services
  const CHUNK_SIZE = 100; // Send 100 notifications per chunk
  const CHUNK_DELAY = 1000; // Wait 1 second between chunks
  let totalSent = 0;
  let totalFailed = 0;
  const allInvalidSubscriptions: string[] = [];

  for (let i = 0; i < validSubscriptions.length; i += CHUNK_SIZE) {
    const chunk = validSubscriptions.slice(i, i + CHUNK_SIZE);

    const results = await Promise.allSettled(
      chunk.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
          { TTL: 60 * 60 * 24 }, // 24h TTL — push service queues it if device offline
        ),
      ),
    );

    totalSent += results.filter((r) => r.status === "fulfilled").length;
    totalFailed += results.filter((r) => r.status === "rejected").length;

    // Collect invalid subscriptions (404/410) for batch deletion
    const invalidInChunk = results
      .map((result, index) => {
        if (result.status !== "rejected") return null;
        const statusCode =
          typeof result.reason === "object" &&
          result.reason !== null &&
          "statusCode" in result.reason
            ? result.reason.statusCode
            : null;
        if (statusCode !== 404 && statusCode !== 410) return null;
        return chunk[index]?.endpoint ?? null;
      })
      .filter((endpoint): endpoint is string => Boolean(endpoint));

    allInvalidSubscriptions.push(...invalidInChunk);

    // Add delay between chunks to avoid overwhelming push services
    if (i + CHUNK_SIZE < validSubscriptions.length) {
      await new Promise((resolve) => setTimeout(resolve, CHUNK_DELAY));
    }
  }

  // Batch-delete expired subscriptions in chunked IN clauses (single
  // roundtrips instead of N concurrent deletes), logging failures.
  if (allInvalidSubscriptions.length > 0) {
    try {
      await deleteSubscriptions(allInvalidSubscriptions);
    } catch (err) {
      captureException(err, {
        tags: { feature: "push", action: "batchDeleteInvalid" },
      });
    }
  }

  if (totalFailed > 0) {
    captureException(
      new Error(`Push send: ${totalFailed}/${validSubscriptions.length} failed`),
      { tags: { feature: "push", route: "/api/push/send" } },
    );
  }

  return NextResponse.json({ ok: true, sent: totalSent, failed: totalFailed }, { headers: NO_STORE });
}
