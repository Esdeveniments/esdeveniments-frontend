import { NextResponse } from "next/server";
import { getSiteUrlFromRequest } from "@config/index";

/**
 * Agent mode view — structured, machine-readable homepage for AI agents.
 * Accessed via /?mode=agent (proxy rewrites to /agent-view).
 */
export async function GET(request: Request) {
  const url = getSiteUrlFromRequest({ headers: request.headers });

  const agentView = {
    name: "Esdeveniments.cat",
    description:
      "The most comprehensive free platform for discovering cultural events across Catalonia. Covers 900+ municipalities with concerts, theatre, exhibitions, festivals, and more.",
    url,
    type: "api",
    category: "Events & Culture",
    region: "Catalonia, Spain",
    languages: ["ca", "es", "en"],
    api: {
      baseUrl: `${url}/api`,
      documentation: `${url}/llms.txt`,
      openapi: `${url}/openapi.json`,
      catalog: `${url}/.well-known/api-catalog`,
      authentication: "none (public read endpoints)",
      rateLimit: "60 requests/minute per IP",
      endpoints: [
        {
          method: "GET",
          path: "/api/events",
          description: "List events with pagination and filters",
          parameters: ["place", "category", "byDate", "term", "page", "pageSize"],
        },
        {
          method: "GET",
          path: "/api/events/{slug}",
          description: "Get event details by slug or ID",
        },
        {
          method: "GET",
          path: "/api/news",
          description: "List news articles",
        },
        {
          method: "GET",
          path: "/api/categories",
          description: "List all event categories",
        },
        {
          method: "GET",
          path: "/api/places",
          description: "Search towns, cities, and regions",
        },
        {
          method: "GET",
          path: "/api/regions",
          description: "List regions with their cities",
        },
        {
          method: "GET",
          path: "/api/cities",
          description: "List all cities",
        },
      ],
    },
    agent: {
      mcpServer: `${url}/.well-known/mcp.json`,
      agentCard: `${url}/.well-known/agent-card.json`,
      agentSkills: `${url}/.well-known/agent-skills/index.json`,
      nlweb: `${url}/ask`,
      aiPlugin: `${url}/.well-known/ai-plugin.json`,
    },
    quickstart: {
      listEvents: `${url}/api/events?place=barcelona&byDate=avui&pageSize=5`,
      searchEvents: `${url}/api/events?place=catalunya&term=jazz&pageSize=5`,
      getEvent: `${url}/api/events/festival-de-jazz-de-barcelona`,
      listCategories: `${url}/api/categories`,
    },
  };

  return NextResponse.json(agentView, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
