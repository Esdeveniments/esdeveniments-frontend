import { NextResponse, after } from "next/server";
import { fetchWithHmac } from "@lib/api/fetch-wrapper";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: Request) {
  // Parse body early (must be done before response is sent)
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

  // Use after() to send visit tracking without blocking response
  // This improves response time since tracking doesn't need to complete before responding
  after(async () => {
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
  });

  return new NextResponse(null, { status: 204 });
}
