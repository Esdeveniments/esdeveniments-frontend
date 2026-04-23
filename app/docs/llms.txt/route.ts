import { NextRequest, NextResponse } from "next/server";
import { getCacheControlHeader } from "@utils/cache";
import { siteUrl } from "@config/index";

/**
 * /docs/llms.txt — Modular llms.txt for documentation section.
 * Provides focused context for agents looking at docs/guides.
 */
export async function GET(request: NextRequest) {
  const lines: string[] = [
    "# Esdeveniments.cat Documentation — llms.txt",
    `# Base URL: ${siteUrl}`,
    "# Updated: " + new Date().toISOString().split("T")[0],
    "",
    "## Overview",
    "Esdeveniments.cat is a free multilingual (ca/es/en) cultural events discovery platform for Catalonia (Spain).",
    "This file covers the documentation and integration guides available.",
    "",
    "## Documentation Index",
    `- Full agent guide: ${siteUrl}/llms.txt`,
    `- API reference: ${siteUrl}/api/llms.txt`,
    `- OpenAPI spec: ${siteUrl}/openapi.json`,
    `- Agent instructions: ${siteUrl}/agent.txt`,
    `- Pricing: ${siteUrl}/pricing.md`,
    `- Homepage (markdown): ${siteUrl}/index.md`,
    "",
    "## Agent Integration",
    `- MCP Server (Streamable HTTP): POST ${siteUrl}/mcp`,
    "  Tools: listEvents, getEvent, listNews, listCategories, listPlaces",
    `- MCP Discovery: ${siteUrl}/.well-known/mcp`,
    `- MCP Server Card: ${siteUrl}/.well-known/mcp/server-card.json`,
    `- Agent Card (A2A): ${siteUrl}/.well-known/agent-card.json`,
    `- AI Plugin: ${siteUrl}/.well-known/ai-plugin.json`,
    `- Agent Skills: ${siteUrl}/.well-known/agent-skills/index.json`,
    `- NLWeb endpoint: POST ${siteUrl}/ask`,
    "",
    "## Authentication",
    "All public read endpoints require no authentication. No API keys needed.",
    "Write endpoints use HMAC signatures (not available externally).",
    "",
    "## Rate Limits",
    "60 requests per minute per IP. HTTP 429 with Retry-After header.",
    "",
    "## About the Platform",
    "- Coverage: 900+ municipalities across all 4 provinces of Catalonia",
    "- Categories: 20+ event types (concerts, theatre, exhibitions, festivals, etc.)",
    "- Languages: Catalan (default), Spanish, English",
    "- Updates: Daily from official sources and community submissions",
    "",
    "## Contact",
    "Email: info@esdeveniments.cat",
    `About: ${siteUrl}/qui-som`,
  ];

  const content = lines.join("\n");
  const cacheControl = getCacheControlHeader(request, 3600);

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": cacheControl,
    },
  });
}
