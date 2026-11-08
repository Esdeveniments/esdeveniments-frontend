import { createHash } from "node:crypto";
import { MCP_TOOLS } from "@config/mcp-tools";
import { PUBLIC_RATE_LIMIT_TEXT } from "@utils/constants";

export const SKILL_NAME = "esdeveniments-cat";
export const SKILL_PATH = `agent-skills/${SKILL_NAME}/SKILL.md`;

const SKILL_DESCRIPTION =
  "Find cultural events (concerts, theatre, exhibitions, festivals, family plans) and local news in Catalonia through the free Esdeveniments.cat API or MCP server.";

export function buildSkillMarkdown(siteUrl: string): string {
  return `---
name: ${SKILL_NAME}
description: ${SKILL_DESCRIPTION}
---

# Esdeveniments.cat

Use this skill to answer questions like "What's on in Barcelona this weekend?" or "Jazz concerts near Girona". It covers 900+ towns in Catalonia (Spain). It does not sell tickets.

## MCP

Streamable HTTP endpoint: \`${siteUrl}/mcp\`. Tools: ${MCP_TOOLS.map((tool) => `\`${tool.name}\``).join(", ")}.

## REST API

No API key. JSON responses. ${PUBLIC_RATE_LIMIT_TEXT}

- \`GET ${siteUrl}/api/events\`: params \`place\`, \`category\`, \`byDate\` (\`avui\`, \`dema\`, \`setmana\`, \`cap-de-setmana\`), \`from\`/\`to\`, \`term\`, \`lat\`/\`lon\`/\`radius\`, \`page\`, \`size\`
- \`GET ${siteUrl}/api/events/{slug}\`: one event
- \`GET ${siteUrl}/api/categories\`, \`/api/places\`, \`/api/regions\`, \`/api/cities\`: valid slugs
- \`GET ${siteUrl}/api/news\`: local news

Lists are paged: keep fetching while \`last\` is \`false\`.

Example: \`curl "${siteUrl}/api/events?place=barcelona&byDate=cap-de-setmana"\`

## Links

- Event pages: \`${siteUrl}/e/{slug}\`. Listings: \`${siteUrl}/{place}/{date}/{category}\`
- OpenAPI: ${siteUrl}/openapi.json
- Docs: ${siteUrl}/developers
`;
}

export function buildSkillsIndex(siteUrl: string) {
  const digest = createHash("sha256")
    .update(buildSkillMarkdown(siteUrl))
    .digest("hex");
  return {
    $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
    skills: [
      {
        name: SKILL_NAME,
        type: "skill-md",
        description: SKILL_DESCRIPTION,
        url: `${siteUrl}/.well-known/${SKILL_PATH}`,
        digest: `sha256:${digest}`,
      },
    ],
  };
}

/** Agent Resource Discovery manifest (ards-project/ard-spec). */
export function buildArdManifest(siteUrl: string) {
  const urn = (kind: string) => `urn:air:esdeveniments.cat:${kind}:events`;
  return {
    specVersion: "1.0",
    host: { displayName: "Esdeveniments.cat" },
    entries: [
      {
        identifier: urn("mcp"),
        displayName: "Esdeveniments.cat MCP server",
        type: "application/mcp-server-card+json",
        url: `${siteUrl}/.well-known/mcp/server-card.json`,
        description:
          "Search cultural events, places and news in Catalonia over MCP.",
        capabilities: MCP_TOOLS.map((tool) => tool.name),
        representativeQueries: [
          "concerts in Barcelona this weekend",
          "what to do in Girona today",
          "family plans in Catalonia",
        ],
        tags: ["events", "catalonia", "culture"],
      },
      {
        identifier: urn("a2a"),
        displayName: "Esdeveniments.cat agent",
        type: "application/a2a-agent-card+json",
        url: `${siteUrl}/.well-known/agent-card.json`,
        representativeQueries: [
          "find theatre in Tarragona",
          "festivals near Lleida this month",
        ],
      },
      {
        identifier: urn("openapi"),
        displayName: "Esdeveniments.cat API",
        type: "application/vnd.oai.openapi+json",
        url: `${siteUrl}/openapi.json`,
        representativeQueries: [
          "cultural events API Catalonia",
          "list events by town and date",
        ],
      },
      {
        identifier: urn("skill"),
        displayName: "Esdeveniments.cat skill",
        type: "application/agent-skills+md",
        url: `${siteUrl}/.well-known/${SKILL_PATH}`,
        representativeQueries: [
          "what's on in Catalonia",
          "exhibitions in Barcelona",
        ],
      },
    ],
  };
}
