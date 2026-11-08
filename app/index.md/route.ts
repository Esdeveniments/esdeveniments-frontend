import { getSiteUrlFromRequest } from "@config/index";
import { PUBLIC_RATE_LIMIT_TEXT } from "@utils/constants";
import {
  isNegotiatedMarkdown,
  MARKDOWN_CONTENT_TYPE,
  NEGOTIATED_MARKDOWN_HEADERS,
} from "@utils/proxy-agent";

/**
 * /index.md — Markdown version of the homepage for AI agents.
 * Agents that prefer markdown over HTML can fetch this canonical URL, and
 * proxy.ts serves it for `Accept: text/markdown` on the homepage URL.
 */
export async function GET(request: Request) {
  const url = getSiteUrlFromRequest({ headers: request.headers });

  const markdown = `---
title: "Esdeveniments.cat — Cultural Events in Catalonia"
description: "Free agenda of concerts, theatre, exhibitions, festivals and family plans in 900+ Catalan towns, with a free public API."
canonical: "${url}/"
---

# Esdeveniments.cat — Cultural Events in Catalonia

Esdeveniments.cat is the most comprehensive free platform for discovering cultural events across Catalonia. We cover 900+ municipalities with concerts, theatre, exhibitions, festivals, and more.

## Quick Start

Browse events: [${url}/catalunya](${url}/catalunya)
Search events: [${url}/catalunya/?search=jazz](${url}/catalunya/?search=jazz)

## API Access

Esdeveniments.cat provides a free public REST API. No authentication required for read endpoints.

- **API Documentation**: [${url}/llms.txt](${url}/llms.txt)
- **OpenAPI Spec**: [${url}/openapi.json](${url}/openapi.json)
- **API Catalog (RFC 9727)**: [${url}/.well-known/api-catalog](${url}/.well-known/api-catalog)

### Example: List Events

\`\`\`
GET ${url}/api/events?place=barcelona&byDate=avui&pageSize=5
\`\`\`

### Example: Search Events

\`\`\`
GET ${url}/api/events?place=catalunya&term=jazz&pageSize=5
\`\`\`

## Key Features

- **900+ municipalities** covered across Catalonia
- **Multilingual**: Catalan, Spanish, English
- **Free API**: No authentication for read endpoints
- **Rate limit**: ${PUBLIC_RATE_LIMIT_TEXT}
- **Categories**: concerts, theatre, exhibitions, festivals, family, workshops, and more
- **Date filters**: today (avui), tomorrow (dema), this week (setmana), weekend (cap-de-setmana)

## API Endpoints

| Endpoint | Description |
|---|---|
| \`GET /api/events\` | List events with pagination and filters |
| \`GET /api/events/{slug}\` | Get event details by slug |
| \`GET /api/news\` | List news articles |
| \`GET /api/news/{slug}\` | Get news article details |
| \`GET /api/categories\` | List all event categories |
| \`GET /api/places\` | List towns, cities, and regions |
| \`GET /api/regions\` | List regions with cities |
| \`GET /api/cities\` | List all cities |

## Agent Discovery

- **MCP Server Card**: [${url}/.well-known/mcp.json](${url}/.well-known/mcp.json)
- **Agent Skills**: [${url}/.well-known/agent-skills/index.json](${url}/.well-known/agent-skills/index.json)
- **NLWeb /ask**: POST to [${url}/ask](${url}/ask) for natural language queries
- **Agent Card (A2A)**: [${url}/.well-known/agent-card.json](${url}/.well-known/agent-card.json)

## Contact

- Email: info@esdeveniments.cat
- Website: [${url}](${url})
`;

  return new Response(markdown, {
    status: 200,
    headers: {
      ...(isNegotiatedMarkdown(request)
        ? NEGOTIATED_MARKDOWN_HEADERS
        : {
            "Content-Type": MARKDOWN_CONTENT_TYPE,
            "Cache-Control":
              "public, max-age=86400, stale-while-revalidate=86400",
          }),
      // The homepage links this file as an alternate; keep search engines
      // indexing the HTML homepage, not a duplicate.
      Link: `<${url}/>; rel="canonical"`,
    },
  });
}
