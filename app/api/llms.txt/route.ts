import { NextRequest, NextResponse } from "next/server";
import { getCacheControlHeader } from "@utils/cache";
import { siteUrl } from "@config/index";

/**
 * Modular llms.txt for the API section.
 * Provides focused documentation for agents only interested in the API endpoints.
 */
export async function GET(request: NextRequest) {
  const lines: string[] = [
    "# Esdeveniments.cat API — llms.txt",
    `# Base URL: ${siteUrl}`,
    "# Updated: " + new Date().toISOString().split("T")[0],
    "",
    "## Overview",
    "Free public REST API for cultural events in Catalonia (Spain). No authentication required for read endpoints. JSON responses with pagination.",
    "",
    "## Endpoints",
    "",
    "### Events",
    "GET /api/events — Search and list cultural events",
    "  Query params: page (int), size (int, max 50), place (slug), category (slug), byDate (avui|dema|setmana|cap-de-setmana), from (ISO date), to (ISO date), term (keyword), lat (float), lon (float), radius (km)",
    "  Response: { content: Event[], currentPage, pageSize, totalElements, totalPages, last }",
    "",
    "GET /api/events/{slug} — Get event details by slug or ID",
    "  Response: EventDetail (title, dates, location, city, region, categories, description, imageUrl)",
    "",
    "### News",
    "GET /api/news — List cultural news articles",
    "  Query params: page, size, place (slug)",
    "  Response: { content: News[], currentPage, pageSize, totalElements, totalPages, last }",
    "",
    "GET /api/news/{slug} — Get news article by slug",
    "",
    "### Reference Data",
    "GET /api/categories — List all event categories (concerts, teatre, exposicions, etc.)",
    "GET /api/places — List all towns, cities, and regions in Catalonia",
    "GET /api/places/{slug} — Get place details",
    "GET /api/regions — List all regions (comarques)",
    "GET /api/cities — List all cities",
    "",
    "## Pagination",
    "All list endpoints return paginated responses. Check `last: true` to detect the final page. Default page size is 15.",
    "",
    "## Rate Limits",
    "60 requests per minute per IP. HTTP 429 with Retry-After header when exceeded.",
    "",
    "## Error Handling",
    "Errors return JSON: { error: string, status: number }. Respect Cache-Control headers to minimize requests.",
    "",
    "## MCP Server",
    `POST ${siteUrl}/mcp — MCP Streamable HTTP endpoint (JSON-RPC 2.0)`,
    "Tools: listEvents, getEvent, listNews, listCategories, listPlaces",
    "",
    "## Full Documentation",
    `- Complete guide: ${siteUrl}/llms.txt`,
    `- OpenAPI spec: ${siteUrl}/openapi.json`,
    `- MCP Server Card: ${siteUrl}/.well-known/mcp/server-card.json`,
  ];

  const content = lines.join("\n");
  const cacheControl = getCacheControlHeader(request, 300);

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": cacheControl,
    },
  });
}
