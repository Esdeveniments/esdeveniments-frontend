import { NextRequest } from "next/server";
import { siteUrl } from "@config/index";
import { fetchEventsExternal, fetchEventBySlug } from "lib/api/events-external";
import { fetchNewsExternal } from "lib/api/news-external";
import { fetchCategoriesExternal } from "lib/api/categories-external";
import { fetchPlacesAggregatedExternal } from "lib/api/places-external";
import type { JsonRpcRequest, JsonRpcResponse } from "types/mcp";

/**
 * MCP (Model Context Protocol) Streamable HTTP endpoint
 * Implements JSON-RPC 2.0 over HTTP with SSE transport.
 *
 * Supports: initialize, tools/list, tools/call, resources/list
 * @see https://spec.modelcontextprotocol.io/specification/2025-03-26/basic/transports/#streamable-http
 */

const MCP_PROTOCOL_VERSION = "2025-03-26";
const SERVER_INFO = {
  name: "esdeveniments-cat",
  version: "1.0.0",
};

const TOOLS = [
  {
    name: "listEvents",
    description:
      "Search and browse cultural events in Catalonia by place, date, category, or keyword. Returns paginated event listings.",
    inputSchema: {
      type: "object" as const,
      properties: {
        place: { type: "string", description: "Place slug (e.g. 'barcelona', 'girona', 'maresme')" },
        category: { type: "string", description: "Category slug (e.g. 'concerts', 'teatre', 'exposicions')" },
        byDate: {
          type: "string",
          description: "Date shortcut: 'avui' (today), 'dema' (tomorrow), 'setmana' (this week), 'cap-de-setmana' (this weekend)",
        },
        term: { type: "string", description: "Free-text search keyword" },
        page: { type: "integer", description: "Page number (0-indexed, default 0)" },
        size: { type: "integer", description: "Results per page (default 15, max 50)" },
      },
    },
    annotations: { title: "List Events", readOnlyHint: true, openWorldHint: true },
  },
  {
    name: "getEvent",
    description: "Get full details for a single cultural event by its slug or ID. Returns title, dates, location, description, and categories.",
    inputSchema: {
      type: "object" as const,
      properties: {
        slug: { type: "string", description: "Event slug or numeric ID" },
      },
      required: ["slug"],
    },
    annotations: { title: "Get Event Details", readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "listNews",
    description: "Browse local cultural news articles from Catalonia, optionally filtered by place.",
    inputSchema: {
      type: "object" as const,
      properties: {
        place: { type: "string", description: "Filter by place slug" },
        page: { type: "integer", description: "Page number (0-indexed)" },
        size: { type: "integer", description: "Results per page (default 15)" },
      },
    },
    annotations: { title: "List News", readOnlyHint: true, openWorldHint: true },
  },
  {
    name: "listCategories",
    description: "List all event categories available on Esdeveniments.cat (concerts, theatre, exhibitions, festivals, etc.)",
    inputSchema: { type: "object" as const, properties: {} },
    annotations: { title: "List Categories", readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "listPlaces",
    description: "List all towns, cities, and regions (comarques) in Catalonia where events are available.",
    inputSchema: { type: "object" as const, properties: {} },
    annotations: { title: "List Places", readOnlyHint: true, openWorldHint: false },
  },
];

const RESOURCES = [
  {
    uri: `${siteUrl}/llms.txt`,
    name: "LLM Integration Guide",
    description: "Comprehensive guide for AI agents to integrate with Esdeveniments.cat",
    mimeType: "text/plain",
  },
  {
    uri: `${siteUrl}/openapi.json`,
    name: "OpenAPI Specification",
    description: "OpenAPI 3.1.0 spec for all public API endpoints",
    mimeType: "application/json",
  },
];

function jsonRpcSuccess(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

function jsonRpcError(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message, ...(data !== undefined && { data }) } };
}

async function handleToolCall(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "listEvents": {
      const data = await fetchEventsExternal({
        place: args.place as string | undefined,
        category: args.category as string | undefined,
        byDate: args.byDate as string | undefined,
        term: args.term as string | undefined,
        page: Number.isInteger(Number(args.page)) ? Number(args.page) : 0,
        size: Number.isInteger(Number(args.size)) ? Math.max(1, Math.min(Number(args.size), 50)) : 15,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              events: data.content.map((e) => ({
                title: e.title,
                slug: e.slug,
                url: e.slug ? `${siteUrl}/e/${e.slug}` : undefined,
                startDate: e.startDate,
                endDate: e.endDate,
                location: e.location,
                city: e.city,
                region: e.region,
                categories: e.categories,
                description: e.description?.slice(0, 300),
                imageUrl: e.imageUrl,
              })),
              pagination: {
                currentPage: data.currentPage,
                totalPages: data.totalPages,
                totalElements: data.totalElements,
                last: data.last,
              },
            }),
          },
        ],
      };
    }

    case "getEvent": {
      const slug = String(args.slug ?? "");
      if (!slug) {
        return {
          content: [{ type: "text", text: "Error: slug parameter is required" }],
          isError: true,
        };
      }
      const event = await fetchEventBySlug(slug);
      if (!event) {
        return {
          content: [{ type: "text", text: `Event not found: ${slug}` }],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              title: event.title,
              slug: event.slug,
              url: `${siteUrl}/e/${event.slug}`,
              startDate: event.startDate,
              endDate: event.endDate,
              location: event.location,
              city: event.city,
              region: event.region,
              province: event.province,
              categories: event.categories,
              description: event.description,
              imageUrl: event.imageUrl,
            }),
          },
        ],
      };
    }

    case "listNews": {
      const data = await fetchNewsExternal({
        place: args.place as string | undefined,
        page: args.page != null ? Number(args.page) : 0,
        size: args.size != null ? Number(args.size) : 15,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              news: data.content.map((n) => ({
                title: n.title,
                slug: n.slug,
                url: n.slug ? `${siteUrl}/noticies/${n.slug}` : undefined,
                description: n.description?.slice(0, 300),
                imageUrl: n.imageUrl,
              })),
              pagination: {
                currentPage: data.currentPage,
                totalPages: data.totalPages,
                totalElements: data.totalElements,
                last: data.last,
              },
            }),
          },
        ],
      };
    }

    case "listCategories": {
      const categories = await fetchCategoriesExternal();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
            ),
          },
        ],
      };
    }

    case "listPlaces": {
      const places = await fetchPlacesAggregatedExternal();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              places.map((p) => ({
                name: p.name,
                slug: p.slug,
                type: p.type,
              })),
            ),
          },
        ],
      };
    }

    default:
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
}

async function handleRequest(req: JsonRpcRequest): Promise<JsonRpcResponse> {
  const id = req.id ?? null;

  switch (req.method) {
    case "initialize":
      return jsonRpcSuccess(id, {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {
          tools: { listChanged: false },
          resources: { subscribe: false, listChanged: false },
        },
        serverInfo: SERVER_INFO,
        instructions:
          "Esdeveniments.cat is a cultural events discovery platform for Catalonia (Spain). " +
          "Use listEvents to search events by place, date, category or keyword. " +
          "Use getEvent for full details. Use listCategories and listPlaces for reference data. " +
          "All data is in Catalan by default; Spanish and English also available.",
      });

    case "notifications/initialized":
      // Client ack — no response needed for notifications (no id)
      return jsonRpcSuccess(id, {});

    case "tools/list":
      return jsonRpcSuccess(id, { tools: TOOLS });

    case "tools/call": {
      const toolName = (req.params?.name as string) ?? "";
      if (!toolName) {
        return jsonRpcError(id, -32602, "Missing required parameter: name", {
          type: "invalid_params",
          param: "name",
        });
      }
      const knownTools = TOOLS.map((t) => t.name);
      if (!knownTools.includes(toolName)) {
        return jsonRpcError(id, -32602, `Unknown tool: ${toolName}`, {
          type: "tool_not_found",
          tool: toolName,
          availableTools: knownTools,
        });
      }
      const toolArgs = (req.params?.arguments as Record<string, unknown>) ?? {};
      try {
        const result = await handleToolCall(toolName, toolArgs);
        return jsonRpcSuccess(id, result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Tool execution failed";
        return jsonRpcError(id, -32603, message, {
          type: "tool_execution_error",
          tool: toolName,
        });
      }
    }

    case "resources/list":
      return jsonRpcSuccess(id, { resources: RESOURCES });

    case "resources/read": {
      const uri = req.params?.uri as string;
      const resource = RESOURCES.find((r) => r.uri === uri);
      if (!resource) {
        return jsonRpcError(id, -32602, `Resource not found: ${uri}`);
      }
      try {
        const res = await fetch(resource.uri, { next: { revalidate: 3600 } });
        const text = res.ok ? await res.text() : `Failed to fetch resource (HTTP ${res.status})`;
        return jsonRpcSuccess(id, {
          contents: [{ uri: resource.uri, mimeType: resource.mimeType, text }],
        });
      } catch {
        return jsonRpcSuccess(id, {
          contents: [{ uri: resource.uri, mimeType: resource.mimeType, text: `Failed to fetch resource: ${resource.uri}` }],
        });
      }
    }

    case "ping":
      return jsonRpcSuccess(id, {});

    default:
      return jsonRpcError(id, -32601, `Method not found: ${req.method}`);
  }
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return new Response(
      JSON.stringify(jsonRpcError(null, -32700, "Content-Type must be application/json")),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify(jsonRpcError(null, -32700, "Parse error")),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const accept = request.headers.get("accept") ?? "";
  const wantsSse = accept.includes("text/event-stream");

  // Handle batch requests
  if (Array.isArray(body)) {
    const responses = await Promise.all(
      body.map((req: JsonRpcRequest) => handleRequest(req)),
    );
    // Filter out notification responses (id === null and no error)
    const filtered = responses.filter((r) => r.id !== null || r.error);

    if (wantsSse) {
      return sseResponse(filtered);
    }
    return new Response(JSON.stringify(filtered), {
      status: 200,
      headers: mcpHeaders(),
    });
  }

  // Single request
  const rpcReq = body as JsonRpcRequest;
  if (!rpcReq.jsonrpc || rpcReq.jsonrpc !== "2.0" || !rpcReq.method) {
    return new Response(
      JSON.stringify(jsonRpcError(rpcReq?.id ?? null, -32600, "Invalid JSON-RPC request")),
      { status: 400, headers: mcpHeaders() },
    );
  }

  const response = await handleRequest(rpcReq);

  if (wantsSse) {
    return sseResponse([response]);
  }

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: mcpHeaders(),
  });
}

export async function GET() {
  // GET returns server metadata (discovery)
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      id: null,
      result: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        serverInfo: SERVER_INFO,
        capabilities: {
          tools: { listChanged: false },
          resources: { subscribe: false, listChanged: false },
        },
        instructions:
          "POST JSON-RPC 2.0 requests to this endpoint. " +
          "Methods: initialize, tools/list, tools/call, resources/list, resources/read, ping.",
      },
    }),
    {
      status: 200,
      headers: {
        ...mcpHeaders(),
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    },
  );
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "GET, POST, OPTIONS",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Protocol-Version",
      "Access-Control-Expose-Headers": "Mcp-Protocol-Version",
    },
  });
}

function mcpHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Mcp-Protocol-Version": MCP_PROTOCOL_VERSION,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers": "Mcp-Protocol-Version",
  };
}

function sseResponse(responses: JsonRpcResponse[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const resp of responses) {
        controller.enqueue(
          encoder.encode(`event: message\ndata: ${JSON.stringify(resp)}\n\n`),
        );
      }
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Mcp-Protocol-Version": MCP_PROTOCOL_VERSION,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Expose-Headers": "Mcp-Protocol-Version",
    },
  });
}
