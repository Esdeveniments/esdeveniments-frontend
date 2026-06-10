import { NextResponse } from "next/server";
import { z } from "zod";
import { captureException } from "@sentry/nextjs";
import {
  upsertSubscription,
  deleteSubscription,
} from "@lib/db/push-subscriptions";

/**
 * Push-service endpoint: must be https (the send route refuses anything
 * else, so persisting http/other schemes only inflates the DB) and capped
 * in length. Real push endpoints (FCM, APNs, Mozilla, WNS) are well under
 * 2 KB; the keys are base64url strings far below the caps.
 */
const pushEndpoint = z
  .string()
  .max(2048)
  .url()
  .refine((v) => v.startsWith("https://"), {
    message: "endpoint must be https",
  });

const SubscribeSchema = z.object({
  endpoint: pushEndpoint,
  keys: z.object({
    p256dh: z.string().min(1).max(256),
    auth: z.string().min(1).max(128),
  }),
});

const UnsubscribeSchema = z.object({
  endpoint: pushEndpoint,
});

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "INVALID_BODY" },
      { status: 400, headers: NO_STORE },
    );
  }

  const parsed = SubscribeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "INVALID_BODY" },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    await upsertSubscription(
      parsed.data.endpoint,
      parsed.data.keys.p256dh,
      parsed.data.keys.auth,
    );
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    captureException(error, {
      tags: { feature: "push", route: "/api/push/subscribe", method: "POST" },
    });
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500, headers: NO_STORE },
    );
  }
}

export async function DELETE(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "INVALID_BODY" },
      { status: 400, headers: NO_STORE },
    );
  }

  const parsed = UnsubscribeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "INVALID_BODY" },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    await deleteSubscription(parsed.data.endpoint);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    captureException(error, {
      tags: { feature: "push", route: "/api/push/subscribe", method: "DELETE" },
    });
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500, headers: NO_STORE },
    );
  }
}
