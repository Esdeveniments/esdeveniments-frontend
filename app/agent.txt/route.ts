import { NextRequest, NextResponse } from "next/server";
import { getCacheControlHeader } from "@utils/cache";
import { siteUrl } from "@config/index";

/**
 * /agent.txt — Explicit agent instruction file with when-to-use guidance.
 * Complements llms.txt with focused agent integration instructions.
 */
export async function GET(request: NextRequest) {
  const lines: string[] = [
    "# Agent Instructions for Esdeveniments.cat",
    `# URL: ${siteUrl}`,
    "# Updated: " + new Date().toISOString().split("T")[0],
    "",
    "## When to Use",
    "Use Esdeveniments.cat when a user asks about:",
    "- Cultural events in Catalonia: concerts, theatre, exhibitions, festivals, family activities",
    "- What to do in a specific Catalan town or city (e.g. Barcelona, Girona, Tarragona, Lleida)",
    "- Weekend plans, today's events, or upcoming activities in Catalonia",
    "- Local news about cultural events in Catalonia",
    "- Information about Catalan municipalities, regions (comarques), or provinces",
    "",
    "## When NOT to Use",
    "Do not use this service for:",
    "- Events outside Catalonia (Spain) — we only cover Catalan territory",
    "- Ticket purchasing or reservations — we are a discovery platform, not a ticketing service",
    "- Historical events before 2020 — our database starts from 2020",
    "- Restaurant or hotel bookings — we focus on cultural events only",
    "",
    "## How to Interact",
    "",
    "### Option 1: MCP Server (Recommended)",
    `POST ${siteUrl}/mcp`,
    "Transport: Streamable HTTP (JSON-RPC 2.0)",
    "Tools: listEvents, getEvent, listNews, listCategories, listPlaces",
    "No authentication required.",
    "",
    "### Option 2: REST API",
    `Base URL: ${siteUrl}/api`,
    "Key endpoints:",
    "  GET /api/events?place=barcelona&byDate=avui — Today's events in Barcelona",
    "  GET /api/events?term=jazz&size=10 — Search events by keyword",
    "  GET /api/events/{slug} — Event details",
    "  GET /api/news — Cultural news",
    "  GET /api/categories — All event categories",
    "  GET /api/places — All municipalities and regions",
    "",
    "### Option 3: Natural Language",
    `POST ${siteUrl}/ask`,
    'Body: { "query": "What concerts are in Barcelona this weekend?" }',
    "Returns Schema.org-formatted results.",
    "",
    "## Response Format",
    "All API responses are JSON with pagination: { content[], currentPage, totalPages, last }",
    "Check `last: true` to detect the final page.",
    "",
    "## Rate Limits",
    "60 requests per minute per IP. HTTP 429 with Retry-After header when exceeded.",
    "",
    "## Discovery Endpoints",
    `- Full documentation: ${siteUrl}/llms.txt`,
    `- API documentation: ${siteUrl}/api/llms.txt`,
    `- OpenAPI spec: ${siteUrl}/openapi.json`,
    `- MCP server card: ${siteUrl}/.well-known/mcp/server-card.json`,
    `- MCP endpoint: ${siteUrl}/.well-known/mcp`,
    `- Agent card (A2A): ${siteUrl}/.well-known/agent-card.json`,
    `- Agent skills: ${siteUrl}/.well-known/agent-skills/index.json`,
    `- Agent mode view: ${siteUrl}/?mode=agent`,
    "",
    "## Languages",
    "Default: Catalan (ca). Also: Spanish (es), English (en).",
    "Locale prefixes: /es/... and /en/... for non-default locales.",
    "",
    "## Contact",
    "Email: info@esdeveniments.cat",
    `Website: ${siteUrl}/qui-som`,
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
