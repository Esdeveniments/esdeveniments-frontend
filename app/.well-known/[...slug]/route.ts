import { NextResponse } from "next/server";
import { siteUrl } from "@config/index";

/**
 * .well-known catch-all route handler
 * Serves agent discovery endpoints and returns 404 for unknown paths.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const path = slug.join("/");

  // /.well-known/agent-skills/index.json
  if (path === "agent-skills/index.json") {
    const skillsIndex = {
      $schema: "https://agentskills.io/schema/v0.2.0/index.json",
      skills: [
        {
          name: "events-discovery",
          type: "api",
          description:
            "Discover cultural events in Catalonia by place, date, and category. Returns event listings with pagination.",
          url: `${siteUrl}/llms.txt`,
        },
        {
          name: "news-reader",
          type: "api",
          description:
            "Read local news articles about events and culture in Catalonia.",
          url: `${siteUrl}/llms.txt`,
        },
        {
          name: "place-explorer",
          type: "api",
          description:
            "Explore towns, cities, and regions in Catalonia to find events near a location.",
          url: `${siteUrl}/llms.txt`,
        },
      ],
    };

    return NextResponse.json(skillsIndex, {
      status: 200,
      headers: {
        "Cache-Control":
          "public, max-age=86400, stale-while-revalidate=86400",
      },
    });
  }

  // /.well-known/mcp/server-card.json
  if (path === "mcp/server-card.json") {
    const serverCard = {
      serverInfo: {
        name: "esdeveniments-cat",
        version: "1.0.0",
        description:
          "Esdeveniments.cat — Cultural events discovery for Catalonia (Spain). Multilingual (ca/es/en) event listings by place, date, and category.",
      },
      capabilities: {
        resources: [
          {
            name: "events",
            description:
              "Search and browse cultural events in Catalonia by place, date, and category",
            uri: `${siteUrl}/api/events`,
          },
          {
            name: "categories",
            description: "List all event categories",
            uri: `${siteUrl}/api/categories`,
          },
          {
            name: "places",
            description:
              "Look up towns, cities, and regions in Catalonia",
            uri: `${siteUrl}/api/places`,
          },
          {
            name: "news",
            description:
              "Read local news about events and culture in Catalonia",
            uri: `${siteUrl}/api/news`,
          },
        ],
      },
      documentation: `${siteUrl}/llms.txt`,
    };

    return NextResponse.json(serverCard, {
      status: 200,
      headers: {
        "Cache-Control":
          "public, max-age=86400, stale-while-revalidate=86400",
      },
    });
  }

  return new Response("Not Found", { status: 404 });
}

