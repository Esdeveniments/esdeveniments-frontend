/**
 * Registers WebMCP tools so AI agents can discover and invoke
 * site actions (search, categories, places, event details) via
 * navigator.modelContext.registerTool().
 *
 * Rendered as an inline <script> (server component) so the registerTool
 * calls are visible in raw HTML for scanner detection, and execute
 * immediately on page load without waiting for React hydration.
 *
 * Titles are localized per W3C WebMCP spec recommendation (§4.2.1).
 *
 * @see https://webmachinelearning.github.io/webmcp/
 */

const titles: Record<string, Record<string, string>> = {
  "search-events": { ca: "Cercar Esdeveniments", es: "Buscar Eventos", en: "Search Events" },
  "get-event-details": { ca: "Detalls de l'Esdeveniment", es: "Detalles del Evento", en: "Get Event Details" },
  "get-categories": { ca: "Llistar Categories", es: "Listar Categorías", en: "List Categories" },
  "get-places": { ca: "Llistar Llocs", es: "Listar Lugares", en: "List Places" },
  "get-events-by-place": { ca: "Esdeveniments per Lloc", es: "Eventos por Lugar", en: "Get Events by Place" },
};

export default function WebMcpTools({ locale = "ca" }: { locale?: string }) {
  const t = (name: string) =>
    JSON.stringify(titles[name]?.[locale] ?? titles[name]?.en ?? name);

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function() {
  var mc = navigator.modelContext;
  if (!mc) return;
  var base = location.origin;

  function reg(tool) {
    try { mc.registerTool(tool); } catch(e) {}
  }

  reg({
    name: "search-events",
    title: ${t("search-events")},
    description: "Search for cultural events in Catalonia by keyword. Returns a list of matching events with title, date, location, and URL.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search keywords (e.g. jazz Barcelona)" },
        page: { type: "integer", description: "Page number (0-indexed, default 0)" },
        size: { type: "integer", description: "Results per page (default 15, max 50)" }
      },
      required: ["query"]
    },
    annotations: { readOnlyHint: true },
    execute: function(input) {
      var p = new URLSearchParams();
      p.set("term", String(input.query || ""));
      if (input.page != null) p.set("page", String(input.page));
      if (input.size != null) p.set("size", String(input.size));
      return fetch(base + "/api/events?" + p).then(function(r) { return r.json(); });
    }
  });

  reg({
    name: "get-event-details",
    title: ${t("get-event-details")},
    description: "Get full details for a single event by its slug. Returns title, description, dates, location, image, and category.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Event slug identifier (from event URL)" }
      },
      required: ["slug"]
    },
    annotations: { readOnlyHint: true },
    execute: function(input) {
      return fetch(base + "/api/events/" + encodeURIComponent(String(input.slug)))
        .then(function(r) { return r.json(); });
    }
  });

  reg({
    name: "get-categories",
    title: ${t("get-categories")},
    description: "List all available event categories (concerts, theatre, exhibitions, festivals, etc.).",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
    execute: function() {
      return fetch(base + "/api/categories").then(function(r) { return r.json(); });
    }
  });

  reg({
    name: "get-places",
    title: ${t("get-places")},
    description: "List available places (cities and towns) in Catalonia that have events.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
    execute: function() {
      return fetch(base + "/api/places").then(function(r) { return r.json(); });
    }
  });

  reg({
    name: "get-events-by-place",
    title: ${t("get-events-by-place")},
    description: "Get cultural events for a specific place (city or town) in Catalonia. Supports filtering by category and date range.",
    inputSchema: {
      type: "object",
      properties: {
        place: { type: "string", description: "Place slug (e.g. barcelona, girona, tarragona)" },
        category: { type: "string", description: "Category slug to filter by (e.g. concerts, teatre, exposicions)" },
        page: { type: "integer", description: "Page number (0-indexed, default 0)" }
      },
      required: ["place"]
    },
    annotations: { readOnlyHint: true },
    execute: function(input) {
      var p = new URLSearchParams();
      p.set("place", String(input.place || ""));
      if (input.category) p.set("category", String(input.category));
      if (input.page != null) p.set("page", String(input.page));
      return fetch(base + "/api/events?" + p).then(function(r) { return r.json(); });
    }
  });
})();`,
      }}
    />
  );
}

