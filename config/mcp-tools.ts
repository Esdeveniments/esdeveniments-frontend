/**
 * Tools served by the MCP endpoint (app/mcp/route.ts) and listed on the
 * /developers/mcp page. Change them here so both stay in sync.
 */
export const MCP_TOOLS = [
  {
    name: "listEvents",
    description:
      "Search and browse cultural events in Catalonia by place, date, category, or keyword. Returns paginated event listings.",
    inputSchema: {
      type: "object" as const,
      properties: {
        place: { type: "string", description: "Place slug (e.g. 'barcelona', 'girona', 'maresme')" },
        category: { type: "string", description: "Category slug (e.g. 'musica', 'teatre', 'exposicions')" },
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
    description: "Get full details for a single cultural event by its slug. Returns title, dates, location, description, and categories.",
    inputSchema: {
      type: "object" as const,
      properties: {
        slug: { type: "string", description: "Event slug" },
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
