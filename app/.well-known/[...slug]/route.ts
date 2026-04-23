import { NextResponse } from "next/server";
import { getSiteUrlFromRequest } from "@config/index";

/**
 * .well-known catch-all route handler
 * Serves agent discovery endpoints and returns 404 for unknown paths.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const path = slug.join("/");
  const url = getSiteUrlFromRequest({ headers: request.headers });

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
          url: `${url}/llms.txt`,
        },
        {
          name: "news-reader",
          type: "api",
          description:
            "Read local news articles about events and culture in Catalonia.",
          url: `${url}/llms.txt`,
        },
        {
          name: "place-explorer",
          type: "api",
          description:
            "Explore towns, cities, and regions in Catalonia to find events near a location.",
          url: `${url}/llms.txt`,
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
      name: "esdeveniments-cat",
      description:
        "Esdeveniments.cat — Cultural events discovery for Catalonia (Spain). Multilingual (ca/es/en) event listings by place, date, and category.",
      version: "1.0.0",
      url: `${url}/mcp`,
      transport: "streamable-http",
      icon: `${url}/icons/icon-512x512.png`,
      capabilities: {
        tools: true,
        resources: true,
      },
      tools: [
        {
          name: "listEvents",
          description:
            "Search and browse cultural events in Catalonia by place, date, and category",
          parameters: {
            place: { type: "string", description: "Place slug (e.g. 'barcelona')" },
            category: { type: "string", description: "Category slug (e.g. 'concerts')" },
            byDate: { type: "string", description: "Date shortcut: avui, dema, setmana, cap-de-setmana" },
            term: { type: "string", description: "Free-text search term" },
          },
        },
        {
          name: "getEvent",
          description: "Get full details for a single event by slug or ID",
          parameters: {
            slug: { type: "string", description: "Event slug or numeric ID", required: true },
          },
        },
        {
          name: "listNews",
          description: "Browse local news about events and culture in Catalonia",
          parameters: {
            place: { type: "string", description: "Filter by place slug" },
          },
        },
        {
          name: "listCategories",
          description: "List all event categories",
          parameters: {},
        },
        {
          name: "listPlaces",
          description: "List all towns, cities, and regions in Catalonia",
          parameters: {},
        },
      ],
      documentation: `${url}/llms.txt`,
    };

    return NextResponse.json(serverCard, {
      status: 200,
      headers: {
        "Cache-Control":
          "public, max-age=86400, stale-while-revalidate=86400",
      },
    });
  }

  // /.well-known/mcp.json (MCP discovery — flat format matching orank convention)
  if (path === "mcp.json") {
    const mcpDiscovery = {
      name: "esdeveniments-cat",
      description:
        "Esdeveniments.cat — Cultural events discovery API for Catalonia. Free multilingual (ca/es/en) events platform with public REST API.",
      version: "1.0.0",
      url: `${url}/mcp`,
      transport: "streamable-http",
      icon: `${url}/icons/icon-512x512.png`,
      capabilities: {
        tools: true,
        resources: true,
      },
      tools: [
        {
          name: "listEvents",
          description: "Search cultural events in Catalonia by place, date, category, or keyword",
          parameters: {
            place: { type: "string", description: "Place slug", required: false },
            category: { type: "string", description: "Category slug", required: false },
            byDate: { type: "string", description: "Date shortcut", required: false },
            term: { type: "string", description: "Search term", required: false },
          },
        },
        {
          name: "getEvent",
          description: "Get event details by slug",
          parameters: {
            slug: { type: "string", description: "Event slug or ID", required: true },
          },
        },
        {
          name: "listCategories",
          description: "List all event categories",
          parameters: {},
        },
        {
          name: "listPlaces",
          description: "List all towns, cities, and regions",
          parameters: {},
        },
        {
          name: "listNews",
          description: "Browse local news",
          parameters: {
            place: { type: "string", description: "Filter by place", required: false },
          },
        },
      ],
      documentation: `${url}/llms.txt`,
      openapi: `${url}/openapi.json`,
    };

    return NextResponse.json(mcpDiscovery, {
      status: 200,
      headers: {
        "Cache-Control":
          "public, max-age=86400, stale-while-revalidate=86400",
      },
    });
  }

  // /.well-known/agent-card.json (Google A2A protocol)
  if (path === "agent-card.json") {
    const agentCard = {
      name: "Esdeveniments.cat",
      description:
        "Cultural events discovery agent for Catalonia (Spain). Provides event listings, news, and place information in Catalan, Spanish, and English.",
      url: url,
      provider: {
        organization: "Esdeveniments.cat",
        url: url,
      },
      version: "1.0.0",
      capabilities: {
        streaming: false,
        pushNotifications: false,
      },
      skills: [
        {
          id: "events-discovery",
          name: "Events Discovery",
          description:
            "Search and browse cultural events by place, date, category, or keyword",
          tags: ["events", "culture", "catalonia"],
          examples: [
            "Find concerts in Barcelona this weekend",
            "What events are happening in Girona today?",
            "Search for jazz festivals in Catalonia",
          ],
        },
        {
          id: "news-reader",
          name: "News Reader",
          description:
            "Read local news about events and culture in Catalonia",
          tags: ["news", "culture", "catalonia"],
        },
        {
          id: "place-explorer",
          name: "Place Explorer",
          description:
            "Explore towns, cities, and regions in Catalonia to find events nearby",
          tags: ["places", "geography", "catalonia"],
        },
      ],
      defaultInputModes: ["text/plain"],
      defaultOutputModes: ["application/json"],
    };

    return NextResponse.json(agentCard, {
      status: 200,
      headers: {
        "Cache-Control":
          "public, max-age=86400, stale-while-revalidate=86400",
      },
    });
  }

  // /.well-known/ai-plugin.json (OpenAI plugin manifest)
  if (path === "ai-plugin.json") {
    const pluginManifest = {
      schema_version: "v1",
      name_for_human: "Esdeveniments.cat",
      name_for_model: "esdeveniments_cat",
      description_for_human:
        "Discover cultural events, concerts, exhibitions, and activities in Catalonia.",
      description_for_model:
        "Search and browse cultural events in Catalonia (Spain) by place, date, category, or keyword. Returns event listings with details including title, date, location, and description. Also provides news, categories, and place information. All responses are in JSON. No authentication required for read endpoints.",
      auth: { type: "none" },
      api: {
        type: "openapi",
        url: `${url}/openapi.json`,
      },
      logo_url: `${url}/icons/icon-512x512.png`,
      contact_email: "info@esdeveniments.cat",
      legal_info_url: `${url}/termes-servei`,
    };

    return NextResponse.json(pluginManifest, {
      status: 200,
      headers: {
        "Cache-Control":
          "public, max-age=86400, stale-while-revalidate=86400",
      },
    });
  }

  // /.well-known/oauth-protected-resource (RFC 9728)
  if (path === "oauth-protected-resource") {
    const oauthResource = {
      resource: url,
      authorization_servers: [`${url}/oauth`],
      scopes_supported: ["read:events", "read:news", "read:places"],
      bearer_methods_supported: ["header"],
      resource_documentation: `${url}/llms.txt`,
    };

    return NextResponse.json(oauthResource, {
      status: 200,
      headers: {
        "Cache-Control":
          "public, max-age=86400, stale-while-revalidate=86400",
      },
    });
  }

  // /.well-known/openid-configuration (OpenID Connect Discovery 1.0)
  // /.well-known/oauth-authorization-server (RFC 8414)
  if (
    path === "openid-configuration" ||
    path === "oauth-authorization-server"
  ) {
    const oauthMeta = {
      issuer: url,
      authorization_endpoint: `${url}/oauth/authorize`,
      token_endpoint: `${url}/oauth/token`,
      jwks_uri: `${url}/oauth/jwks`,
      registration_endpoint: `${url}/oauth/register`,
      scopes_supported: ["openid", "read:events", "read:news", "read:places"],
      response_types_supported: ["code"],
      grant_types_supported: [
        "authorization_code",
        "client_credentials",
      ],
      token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic"],
      service_documentation: `${url}/llms.txt`,
      code_challenge_methods_supported: ["S256"],
    };

    return NextResponse.json(oauthMeta, {
      status: 200,
      headers: {
        "Cache-Control":
          "public, max-age=86400, stale-while-revalidate=86400",
      },
    });
  }

  // /.well-known/ucp (Universal Commerce Protocol discovery profile)
  if (path === "ucp") {
    const ucpProfile = {
      ucp: {
        version: "2026-04-08",
        services: {
          "cat.esdeveniments.events": [
            {
              version: "2026-04-08",
              spec: `${url}/llms.txt`,
              transport: "mcp",
              endpoint: `${url}/mcp`,
              schema: `${url}/openapi.json`,
            },
            {
              version: "2026-04-08",
              spec: `${url}/llms.txt`,
              transport: "rest",
              endpoint: `${url}/api`,
              schema: `${url}/openapi.json`,
            },
          ],
        },
        capabilities: {
          "cat.esdeveniments.events.discovery": [
            {
              version: "2026-04-08",
              spec: `${url}/llms.txt`,
              schema: `${url}/openapi.json`,
            },
          ],
        },
      },
    };

    return NextResponse.json(ucpProfile, {
      status: 200,
      headers: {
        "Cache-Control":
          "public, max-age=86400, stale-while-revalidate=86400",
      },
    });
  }

  // /.well-known/mcp — Handled by proxy.ts rewrite to /mcp (preserves POST body)
  // GET fallback: return MCP server info for discovery
  if (path === "mcp") {
    return NextResponse.json(
      {
        name: "esdeveniments-cat",
        description: "Esdeveniments.cat MCP Server — Cultural events discovery for Catalonia",
        url: `${url}/mcp`,
        transport: "streamable-http",
        method: "POST",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=86400",
        },
      },
    );
  }

  return new Response("Not Found", { status: 404 });
}

