import { NextRequest, NextResponse } from "next/server";
import { getCacheControlHeader } from "@utils/cache";
import { siteUrl } from "@config/index";

/**
 * /pricing.md — Machine-readable pricing information for AI agents.
 * Describes free public API and sponsor pricing tiers.
 */
export async function GET(request: NextRequest) {
  const lines: string[] = [
    "# Esdeveniments.cat Pricing",
    "",
    "## API Access — Free",
    "",
    "All public API endpoints are **completely free** with no authentication required.",
    "",
    "| Feature | Details |",
    "| --- | --- |",
    "| Price | Free (€0) |",
    "| Authentication | None required |",
    "| Rate limit | 60 requests/minute per IP |",
    "| Endpoints | Events, News, Categories, Places, Regions, Cities |",
    "| Data format | JSON with pagination |",
    "| MCP Server | Free access via Streamable HTTP |",
    "| NLWeb endpoint | Free natural language queries |",
    "| OpenAPI spec | Available at /openapi.json |",
    "",
    "## MCP Server Access — Free",
    "",
    `The MCP server at ${siteUrl}/mcp provides 5 tools (listEvents, getEvent, listNews, listCategories, listPlaces) with no authentication.`,
    "",
    "## Event Discovery — Free for Users",
    "",
    "Browsing events on the website is completely free for all users. No account needed.",
    "",
    "## Sponsor / Promote Events",
    "",
    "Event organizers and businesses can promote their events with featured placement.",
    "",
    "### Town Scope (single municipality)",
    "| Duration | Price |",
    "| --- | --- |",
    "| 7 days | €5.00 |",
    "| 14 days | €8.00 |",
    "| 30 days | €15.00 |",
    "",
    "### Region Scope (comarca/county)",
    "| Duration | Price |",
    "| --- | --- |",
    "| 7 days | €10.00 |",
    "| 14 days | €15.00 |",
    "| 30 days | €25.00 |",
    "",
    "### Country Scope (all Catalonia)",
    "| Duration | Price |",
    "| --- | --- |",
    "| 7 days | €15.00 |",
    "| 14 days | €25.00 |",
    "| 30 days | €40.00 |",
    "",
    "### What Sponsors Get",
    "- Featured banner placement on relevant event listing pages",
    "- Priority visibility for the sponsored duration",
    "- Geographic targeting (town, region, or all of Catalonia)",
    "- Self-serve checkout via Stripe (instant activation)",
    "",
    "## Summary",
    "",
    "| Tier | Price | What You Get |",
    "| --- | --- | --- |",
    "| API Access | Free | Full REST API + MCP + NLWeb |",
    "| Event Browsing | Free | Unlimited event discovery |",
    "| Sponsor (Town) | €5-15 | Featured placement in 1 municipality |",
    "| Sponsor (Region) | €10-25 | Featured placement in 1 comarca |",
    "| Sponsor (Country) | €15-40 | Featured placement across Catalonia |",
    "",
    `More details: ${siteUrl}/patrocina`,
  ];

  const content = lines.join("\n");
  const cacheControl = getCacheControlHeader(request, 3600);

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": cacheControl,
    },
  });
}
