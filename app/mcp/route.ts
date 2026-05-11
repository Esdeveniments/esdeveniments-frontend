import { NextRequest } from "next/server";
import { siteUrl } from "@config/index";
import { fetchEventsExternal, fetchEventBySlug } from "lib/api/events-external";
import { fetchNewsExternal } from "lib/api/news-external";
import { fetchCategoriesExternal } from "lib/api/categories-external";
import { fetchPlacesAggregatedExternal } from "lib/api/places-external";
import type { JsonRpcRequest, JsonRpcResponse } from "types/mcp";
import { createRateLimiter } from "@utils/rate-limit";
import { isSafePublicFetchUrl } from "@utils/public-fetch-safety";

/**
 * MCP (Model Context Protocol) Streamable HTTP endpoint
 * Implements JSON-RPC 2.0 over HTTP with SSE transport.
 *
 * Supports: initialize, tools/list, tools/call, resources/list
 * @see https://spec.modelcontextprotocol.io/specification/2025-03-26/basic/transports/#streamable-http
 */

const MCP_PROTOCOL_VERSION = "2025-03-26";
const MAX_MCP_BODY_BYTES = 100_000;
const MAX_MCP_BATCH_SIZE = 5;
const mcpLimiter = createRateLimiter({ maxRequests: 60, windowMs: 60_000 });
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
    _meta: { ui: { resourceUri: "ui://esdeveniments-cat/events-search" } },
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
    _meta: { ui: { resourceUri: "ui://esdeveniments-cat/event-detail" } },
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
  {
    uri: "ui://esdeveniments-cat/events-search",
    name: "Events Search UI",
    description: "Interactive search interface for cultural events in Catalonia",
    mimeType: "text/html",
  },
  {
    uri: "ui://esdeveniments-cat/event-detail",
    name: "Event Detail UI",
    description: "Interactive event detail view with map and calendar integration",
    mimeType: "text/html",
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

function isJsonRpcRequest(candidate: unknown): candidate is JsonRpcRequest {
  if (!candidate || typeof candidate !== "object") return false;
  const request = candidate as { jsonrpc?: unknown; method?: unknown };
  return request.jsonrpc === "2.0" && typeof request.method === "string";
}

async function handleToolCall(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "listEvents": {
      const data = await fetchEventsExternal({
        place: args.place as string | undefined,
        category: args.category as string | undefined,
        byDate: args.byDate as string | undefined,
        term: args.term as string | undefined,
        page: Number.isInteger(Number(args.page)) ? Math.max(0, Number(args.page)) : 0,
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
        page: Number.isInteger(Number(args.page)) ? Math.max(0, Number(args.page)) : 0,
        size: Number.isInteger(Number(args.size)) ? Math.max(1, Math.min(Number(args.size), 50)) : 15,
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

function generateAppHtml(uri: string): string | null {
  if (uri === "ui://esdeveniments-cat/events-search") {
    return `<!DOCTYPE html>
<html lang="ca">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Esdeveniments.cat — Events Search</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;padding:16px;color:#1a1a1a;background:#fff}
h1{font-size:1.25rem;margin-bottom:12px}
.field{margin-bottom:8px}
label{display:block;font-size:.85rem;font-weight:600;margin-bottom:2px}
input,select{width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:.9rem}
button{background:#e63946;color:#fff;border:none;padding:10px 20px;border-radius:6px;font-size:.9rem;cursor:pointer;margin-top:8px}
button:hover{background:#c1121f}
#results{margin-top:16px}
.event{border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:8px}
.event h3{font-size:1rem;margin-bottom:4px}
.event p{font-size:.85rem;color:#4b5563}
</style>
</head>
<body>
<h1>Cerca esdeveniments culturals</h1>
<div class="field"><label>Lloc</label><input id="place" placeholder="barcelona, girona..."/></div>
<div class="field"><label>Categoria</label><input id="category" placeholder="concerts, teatre..."/></div>
<div class="field"><label>Data</label><select id="byDate"><option value="">Tots</option><option value="avui">Avui</option><option value="dema">Demà</option><option value="setmana">Aquesta setmana</option><option value="cap-de-setmana">Cap de setmana</option></select></div>
<div class="field"><label>Cerca</label><input id="term" placeholder="Paraula clau..."/></div>
<button onclick="search()">Cercar</button>
<div id="results"></div>
<script>
function search(){
  const args={};
  ['place','category','byDate','term'].forEach(k=>{const v=document.getElementById(k).value;if(v)args[k]=v});
  window.parent.postMessage({type:'mcp:tool_call',tool:'listEvents',arguments:args},'*');
}
window.addEventListener('message',e=>{
  if(e.source!==window.parent)return;
  if(e.data?.type==='mcp:tool_result'){
    try{
      const d=JSON.parse(e.data.content);
      const el=document.getElementById('results');
      el.replaceChildren();
      if(!d.events?.length){const p=document.createElement('p');p.textContent='Cap resultat';el.appendChild(p);return}
      d.events.forEach(ev=>{
        const item=document.createElement('div');item.className='event';
        const title=document.createElement('h3');title.textContent=ev.title||'';
        const meta=document.createElement('p');meta.textContent=[ev.startDate||'',ev.location||ev.city?.name||''].filter(Boolean).join(' · ');
        item.append(title,meta);el.appendChild(item);
      });
    }catch{}
  }
});
</script>
</body>
</html>`;
  }

  if (uri === "ui://esdeveniments-cat/event-detail") {
    return `<!DOCTYPE html>
<html lang="ca">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Esdeveniments.cat — Event Detail</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;padding:16px;color:#1a1a1a;background:#fff}
h1{font-size:1.25rem;margin-bottom:8px}
.meta{font-size:.85rem;color:#4b5563;margin-bottom:12px}
.desc{font-size:.9rem;line-height:1.5}
.tags{margin-top:12px;display:flex;gap:6px;flex-wrap:wrap}
.tag{background:#fee2e2;color:#991b1b;padding:4px 10px;border-radius:12px;font-size:.8rem}
a{color:#e63946}
#event{display:none}
#loading{text-align:center;padding:20px;color:#6b7280}
</style>
</head>
<body>
<div id="loading">Carregant...</div>
<div id="event">
<h1 id="title"></h1>
<div class="meta"><span id="dates"></span> · <span id="location"></span></div>
<div class="desc" id="description"></div>
<div class="tags" id="categories"></div>
<p style="margin-top:12px"><a id="link" href="#" target="_blank">Veure a Esdeveniments.cat →</a></p>
</div>
<script>
window.addEventListener('message',e=>{
  if(e.source!==window.parent)return;
  if(e.data?.type==='mcp:tool_result'){
    try{
      const ev=JSON.parse(e.data.content);
      document.getElementById('loading').style.display='none';
      document.getElementById('event').style.display='block';
      document.getElementById('title').textContent=ev.title||'';
      document.getElementById('dates').textContent=[ev.startDate,ev.endDate].filter(Boolean).join(' – ');
      document.getElementById('location').textContent=ev.location||ev.city?.name||'';
      document.getElementById('description').textContent=(ev.description||'').slice(0,500);
      const categories=document.getElementById('categories');categories.replaceChildren();
      if(ev.categories?.length){ev.categories.forEach(c=>{const tag=document.createElement('span');tag.className='tag';tag.textContent=typeof c==='string'?c:(c.name||'');categories.appendChild(tag);})}
      if(ev.url){const a=document.getElementById('link');a.href=ev.url;a.style.display='inline'}
    }catch{}
  }
});
</script>
</body>
</html>`;
  }

  return null;
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
          experimental: {
            "ext-apps": {
              version: "2026-01-26",
              supported: true,
            },
          },
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

      // Handle ui:// resources for MCP Apps
      if (uri.startsWith("ui://")) {
        const html = generateAppHtml(uri);
        if (!html) {
          return jsonRpcError(id, -32602, `Unknown UI resource: ${uri}`);
        }
        return jsonRpcSuccess(id, {
          contents: [{ uri, mimeType: "text/html", text: html }],
        });
      }

      try {
        const resourcePath = new URL(resource.uri).pathname;
        const resourceUrl = new URL(resourcePath, siteUrl).toString();
        if (!(await isSafePublicFetchUrl(resourceUrl))) {
          return jsonRpcError(id, -32603, "Unsafe resource URL");
        }
        const res = await fetch(resourceUrl, {
          next: { revalidate: 3600 },
          redirect: "manual",
        });
        if (!res.ok) {
          return jsonRpcError(id, -32603, `Failed to fetch resource (HTTP ${res.status})`);
        }
        const text = await res.text();
        return jsonRpcSuccess(id, {
          contents: [{ uri: resource.uri, mimeType: resource.mimeType, text }],
        });
      } catch {
        return jsonRpcError(id, -32603, `Failed to fetch resource: ${uri}`);
      }
    }

    case "ping":
      return jsonRpcSuccess(id, {});

    default:
      return jsonRpcError(id, -32601, `Method not found: ${req.method}`);
  }
}

export async function POST(request: NextRequest) {
  const blocked = mcpLimiter.check(request);
  if (blocked) return blocked;

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return new Response(
      JSON.stringify(jsonRpcError(null, -32700, "Content-Type must be application/json")),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_MCP_BODY_BYTES) {
    return new Response(
      JSON.stringify(jsonRpcError(null, -32700, "Request body too large")),
      { status: 413, headers: mcpHeaders() },
    );
  }

    let bodyText: string;
    try {
      bodyText = await request.text();
    } catch {
      return new Response(JSON.stringify(jsonRpcError(null, -32700, "Parse error")), {
        status: 400,
        headers: mcpHeaders(),
      });
    }

    if (bodyText.length > MAX_MCP_BODY_BYTES) {
      return new Response(
        JSON.stringify(jsonRpcError(null, -32700, "Request body too large")),
        { status: 413, headers: mcpHeaders() },
      );
    }

    let body: unknown;
  try {
      body = JSON.parse(bodyText);
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
    if (body.length > MAX_MCP_BATCH_SIZE) {
      return new Response(
        JSON.stringify(jsonRpcError(null, -32600, "JSON-RPC batch too large")),
        { status: 413, headers: mcpHeaders() },
      );
    }

    const responses: JsonRpcResponse[] = [];
    for (const req of body) {
      responses.push(
        isJsonRpcRequest(req)
          ? await handleRequest(req)
          : jsonRpcError(null, -32600, "Invalid JSON-RPC request"),
      );
    }
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
  if (!isJsonRpcRequest(body)) {
    return new Response(
      JSON.stringify(jsonRpcError(null, -32600, "Invalid JSON-RPC request")),
      { status: 400, headers: mcpHeaders() },
    );
  }

  const response = await handleRequest(body);

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
