import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import webpush from "web-push";
import { captureException } from "@sentry/nextjs";
import {
  deleteSubscriptions,
  getSubscriptionsPage,
  PUSH_PAGE_SIZE,
} from "@lib/db/push-subscriptions";
import { isInternalHost } from "@config/index";
import { normalizeHost } from "@utils/host-validation";

// Only relevant on Vercel preview deploys (production runs a persistent
// Node server on Coolify where route duration is unbounded). Keeps the
// chunked broadcast loop from being killed at the default timeout.
export const maxDuration = 60;

const NO_STORE = { "Cache-Control": "no-store" } as const;

/**
 * Constant-time string compare for the bearer secret. A length mismatch
 * short-circuits (the only thing it leaks is length), and equal-length
 * inputs are compared without an early-exit byte loop, so response time
 * doesn't reveal how many bytes matched.
 */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

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
  if (!secret || !authHeader || !safeEqual(authHeader, `Bearer ${secret}`)) {
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

  const payload = JSON.stringify({
    title: parsed.data.title,
    body: parsed.data.body,
    url: parsed.data.url,
    icon: parsed.data.icon,
  });

  // Max push requests in flight at once. The awaited batch is the real
  // backpressure (never more than this outstanding), so no artificial delay
  // is needed — an inter-batch sleep only multiplies wall-clock time and
  // risks gateway timeouts as the subscriber base grows.
  const SEND_CONCURRENCY = 100;

  let cursor = 0;
  let totalSent = 0;
  let totalFailed = 0;
  let totalValid = 0;

  // Stream subscriptions a page at a time (keyset on id) so memory stays flat
  // regardless of table size. On a DB error mid-broadcast, report what was
  // sent rather than failing the whole request.
  try {
    for (;;) {
      const page = await getSubscriptionsPage(cursor, PUSH_PAGE_SIZE);
      if (page.length === 0) break;
      cursor = page[page.length - 1].id;

      // SSRF re-filter: https only, reject literal internal/loopback hosts.
      // The full DNS-resolving check runs once at subscribe time; re-resolving
      // every endpoint on every broadcast would be wasteful.
      const validSubscriptions = page.filter((sub) => {
        try {
          const url = new URL(sub.endpoint);
          if (url.protocol !== "https:") return false;
          return !isInternalHost(normalizeHost(url.hostname));
        } catch {
          return false;
        }
      });
      totalValid += validSubscriptions.length;

      // Per-page accumulator so memory stays bounded by page size even when
      // a large share of subscriptions are expired (flushed below per page).
      const invalidInPage: string[] = [];

      for (let i = 0; i < validSubscriptions.length; i += SEND_CONCURRENCY) {
        const batch = validSubscriptions.slice(i, i + SEND_CONCURRENCY);

        const results = await Promise.allSettled(
          batch.map((sub) =>
            webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
              },
              payload,
              { TTL: 60 * 60 * 24 }, // 24h TTL — queued if device offline
            ),
          ),
        );

        totalSent += results.filter((r) => r.status === "fulfilled").length;
        totalFailed += results.filter((r) => r.status === "rejected").length;

        // Collect expired subscriptions (404/410) for batch deletion.
        const invalidInBatch = results
          .map((result, index) => {
            if (result.status !== "rejected") return null;
            const statusCode =
              typeof result.reason === "object" &&
              result.reason !== null &&
              "statusCode" in result.reason
                ? result.reason.statusCode
                : null;
            if (statusCode !== 404 && statusCode !== 410) return null;
            return batch[index]?.endpoint ?? null;
          })
          .filter((endpoint): endpoint is string => Boolean(endpoint));

        invalidInPage.push(...invalidInBatch);
      }

      // Flush this page's expired (404/410) subscriptions — chunked IN
      // deletes inside the helper, failures logged but non-fatal.
      if (invalidInPage.length > 0) {
        try {
          await deleteSubscriptions(invalidInPage);
        } catch (err) {
          captureException(err, {
            tags: { feature: "push", action: "batchDeleteInvalid" },
          });
        }
      }

      if (page.length < PUSH_PAGE_SIZE) break;
    }
  } catch (err) {
    captureException(err, {
      tags: { feature: "push", action: "broadcast" },
    });
    // Fall through: report partial counts below.
  }

  if (totalFailed > 0) {
    captureException(
      new Error(`Push send: ${totalFailed}/${totalValid} failed`),
      { tags: { feature: "push", route: "/api/push/send" } },
    );
  }

  return NextResponse.json(
    { ok: true, sent: totalSent, failed: totalFailed },
    { headers: NO_STORE },
  );
}
