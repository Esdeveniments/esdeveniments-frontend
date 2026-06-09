import { NextResponse } from "next/server";
import { z } from "zod";
import { captureException } from "@sentry/nextjs";
import {
  upsertSubscription,
  deleteSubscription,
} from "@lib/db/push-subscriptions";

const SubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

const UnsubscribeSchema = z.object({
  endpoint: z.string().url(),
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
