import { NextResponse } from "next/server";
import { fetchWithHmac } from "@lib/api/fetch-wrapper";
import { handleApiError } from "@utils/api-error-handler";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { eventId, slug } = (await request.json().catch(() => ({}))) as {
      eventId?: string | number;
      slug?: string;
    };

    // Require at least one identifier; if missing, no-op 204
    if (!eventId && !slug) {
      return new NextResponse(null, { status: 204 });
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    const visitsEndpoint = process.env.VISITS_ENDPOINT; // optional override

    if (!apiBase || !visitsEndpoint) {
      // Backend endpoint not configured; accept and return
      return new NextResponse(null, { status: 204 });
    }

    const url = visitsEndpoint.startsWith("http")
      ? visitsEndpoint
      : `${apiBase}${visitsEndpoint}`;

    // Forward visitor id from middleware (if present)
    const incomingVisitorId = request.headers.get("x-visitor-id") || undefined;
    const headers: HeadersInit = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (incomingVisitorId) headers["x-visitor-id"] = incomingVisitorId;

    await fetchWithHmac(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ eventId, slug }),
    }).catch((e) => {
      // Log forward errors but don't fail the request
      console.error("/api/visits forward error:", e);
      if (process.env.NODE_ENV === "production") {
        Sentry.captureException(e, {
          tags: { route: "/api/visits", type: "forward_error" },
        });
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return handleApiError(e, "/api/visits", {
      fallbackData: null,
    });
  }
}

