import { NextResponse } from "next/server";
import { captureException } from "@sentry/nextjs";
import { PlannerRequestSchema } from "types/planner";
import type { PlannerErrorResponse } from "types/planner";
import { DEFAULT_LOCALE } from "types/i18n";
import { runPlanner } from "@lib/planner/run";

function errorBody(
  error: PlannerErrorResponse["error"],
  message?: string,
): PlannerErrorResponse {
  return { ok: false, error, message };
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(errorBody("INVALID_BODY"), {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const parsed = PlannerRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(errorBody("INVALID_BODY", parsed.error.message), {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const { query } = parsed.data;
  const locale = parsed.data.locale ?? DEFAULT_LOCALE;
  const today = new Date().toISOString().slice(0, 10);

  try {
    const result = await runPlanner({ query, locale, today });
    if (!result.ok) {
      const status = result.error === "LLM_UNAVAILABLE" ? 503 : 502;
      return NextResponse.json(errorBody(result.error, result.message), {
        status,
        headers: { "Cache-Control": "no-store" },
      });
    }
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: unknown) {
    captureException(error, {
      tags: { feature: "planner", route: "/api/planner" },
    });
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(errorBody("INTERNAL", message), {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
