import { NextRequest, NextResponse } from "next/server";
import { siteUrl } from "@config/index";
import { fetchEventsExternal } from "lib/api/events-external";
import type { EventSummaryResponseDTO } from "types/api/event";

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
    // Call external API directly (route handlers use external wrappers, not self-fetch)
    const data = await fetchEventsExternal({
      term: queryText,
      size: 10,
      page: 0,
    });

    const events = data.content;

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
        (event: EventSummaryResponseDTO) => !event.isAd,
      )
      .slice(0, 10)
      .map((event: EventSummaryResponseDTO) => ({
        "@type": "Event",
        "@context": "https://schema.org",
        name: event.title,
        description: event.description,
        url: event.slug ? `${siteUrl}/e/${event.slug}` : siteUrl,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location
          ? {
              "@type": "Place",
              name: event.location,
            }
          : undefined,
        image: event.imageUrl || undefined,
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
