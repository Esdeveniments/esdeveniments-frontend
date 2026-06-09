import { NextResponse } from "next/server";
import { z } from "zod";
import webpush from "web-push";
import { captureException } from "@sentry/nextjs";
import {
  deleteSubscription,
  getAllSubscriptions,
} from "@lib/db/push-subscriptions";

const NO_STORE = { "Cache-Control": "no-store" } as const;

const SendSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(300),
  url: z.string().optional().default("/"),
  icon: z
    .string()
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
  // Protect with REVALIDATE_SECRET — same pattern as /api/revalidate
  const authHeader = request.headers.get("authorization");
  const secret = process.env.REVALIDATE_SECRET;
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

  // Validate endpoints to prevent SSRF attacks — must be https://
  const validSubscriptions = subscriptions.filter((sub) => {
    try {
      const url = new URL(sub.endpoint);
      // Only allow https:// endpoints from push services
      return url.protocol === "https:";
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

  // Batch delete invalid subscriptions
  if (allInvalidSubscriptions.length > 0) {
    await Promise.allSettled(
      allInvalidSubscriptions.map((endpoint) => deleteSubscription(endpoint)),
    );
  }

  if (totalFailed > 0) {
    captureException(
      new Error(`Push send: ${totalFailed}/${validSubscriptions.length} failed`),
      { tags: { feature: "push", route: "/api/push/send" } },
    );
  }

  return NextResponse.json({ ok: true, sent: totalSent, failed: totalFailed }, { headers: NO_STORE });
}
