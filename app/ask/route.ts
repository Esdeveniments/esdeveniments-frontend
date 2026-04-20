import { NextRequest, NextResponse } from "next/server";
import { getSiteUrlFromRequest, siteUrl } from "@config/index";

/**
 * NLWeb /ask endpoint (Microsoft Research NLWeb protocol v0.55)
 * Returns Schema.org typed results with _meta conformant response.
 * Proxies natural language queries to our events API.
 */
export async function POST(request: NextRequest) {
  let body: { query?: { text?: string }; prefer?: { mode?: string } };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        _meta: {
          response_type: "failure",
          version: "0.55",
        },
        error: { code: "INVALID_REQUEST", message: "Invalid JSON body" },
      },
      { status: 400 },
    );
  }

  const queryText = body?.query?.text;
  if (!queryText) {
    return NextResponse.json(
      {
        _meta: {
          response_type: "failure",
          version: "0.55",
        },
        error: {
          code: "MISSING_QUERY",
          message: "query.text is required",
        },
      },
      { status: 400 },
    );
  }

  try {
    // Search events using our internal API
    const params = new URLSearchParams({
      term: queryText,
      size: "10",
      page: "0",
    });

    const baseUrl = getSiteUrlFromRequest(request);
    const eventsUrl = `${baseUrl}/api/events?${params.toString()}`;
    const res = await fetch(eventsUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          _meta: {
            response_type: "failure",
            version: "0.55",
          },
          error: {
            code: "UPSTREAM_ERROR",
            message: `Events API returned ${res.status}`,
          },
        },
        { status: 502 },
      );
    }

    const data = await res.json();
    const events = data?.content ?? [];

    if (events.length === 0) {
      return NextResponse.json(
        {
          _meta: {
            response_type: "answer",
            response_format: "conversational_search",
            version: "0.55",
          },
          results: [],
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "public, max-age=60, s-maxage=300",
          },
        },
      );
    }

    // Map events to Schema.org Event objects
    const results = events
      .filter(
        (event: Record<string, unknown>) =>
          event && !("isAd" in event && event.isAd),
      )
      .slice(0, 10)
      .map((event: Record<string, unknown>) => ({
        "@type": "Event",
        "@context": "https://schema.org",
        name: event.title ?? "",
        description: event.description ?? "",
        url: event.slug
          ? `${siteUrl}/e/${event.slug as string}`
          : siteUrl,
        startDate: event.startDate ?? undefined,
        endDate: event.endDate ?? undefined,
        location: event.location
          ? {
              "@type": "Place",
              name: event.location,
            }
          : undefined,
        image: event.imageUrl ?? undefined,
      }));

    return NextResponse.json(
      {
        _meta: {
          response_type: "answer",
          response_format: "conversational_search",
          version: "0.55",
        },
        results,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=300",
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        _meta: {
          response_type: "failure",
          version: "0.55",
        },
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to process query",
        },
      },
      { status: 500 },
    );
  }
}

/**
 * GET /ask returns protocol info (NLWeb discovery)
 */
export async function GET() {
  return NextResponse.json(
    {
      _meta: {
        response_type: "answer",
        version: "0.55",
      },
      protocol: "NLWeb",
      version: "0.55",
      description:
        "Natural language interface for discovering cultural events in Catalonia",
      documentation: `${siteUrl}/llms.txt`,
      accepts: "POST with { query: { text: '...' } }",
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=86400",
      },
    },
  );
}
