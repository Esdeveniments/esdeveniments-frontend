import { NextResponse } from "next/server";
import { z } from "zod";
import webpush from "web-push";
import { captureException } from "@sentry/nextjs";
import { getAllSubscriptions } from "@lib/db/push-subscriptions";

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

  const payload = JSON.stringify({
    title: parsed.data.title,
    body: parsed.data.body,
    url: parsed.data.url,
    icon: parsed.data.icon,
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
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

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  if (failed > 0) {
    captureException(
      new Error(`Push send: ${failed}/${subscriptions.length} failed`),
      { tags: { feature: "push", route: "/api/push/send" } },
    );
  }

  return NextResponse.json({ ok: true, sent, failed }, { headers: NO_STORE });
}
