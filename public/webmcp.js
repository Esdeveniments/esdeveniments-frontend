/*
 * WebMCP tools: lets browser agents search events, read event details and
 * list categories and places on esdeveniments.cat.
 * Spec: https://webmachinelearning.github.io/webmcp/
 *
 * Loaded from the root layout as a same-origin script (agent-readiness
 * scanners read script files, not inline code). Plain ES5 so it needs no build.
 * Titles follow <html lang>.
 */
(function () {
  "use strict";

  var lang = (document.documentElement.lang || "ca").slice(0, 2);

  var TITLES = {
    "search-events": { ca: "Cercar esdeveniments", es: "Buscar eventos", en: "Search events" },
    "get-event-details": { ca: "Detalls de l'esdeveniment", es: "Detalles del evento", en: "Get event details" },
    "get-categories": { ca: "Llistar categories", es: "Listar categorías", en: "List categories" },
    "get-places": { ca: "Llistar llocs", es: "Listar lugares", en: "List places" },
    "get-events-by-place": { ca: "Esdeveniments per lloc", es: "Eventos por lugar", en: "Get events by place" }
  };

  function title(name) {
    var t = TITLES[name] || {};
    return t[lang] || t.en || name;
  }

  function getJson(path) {
    return fetch(path, { headers: { Accept: "application/json" } }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status + " for " + path);
      return r.json();
    });
  }

  // document.modelContext is the current API; navigator.modelContext is the
  // older location, kept as a fallback for early implementations.
  function registerTool(tool) {
    try {
      if (document.modelContext && document.modelContext.registerTool) {
        document.modelContext.registerTool(tool);
      } else if (navigator.modelContext && navigator.modelContext.registerTool) {
        navigator.modelContext.registerTool(tool);
      }
    } catch (e) {
      if (window.console) console.warn("[webmcp]", tool.name, e);
    }
  }

  var readOnly = { readOnlyHint: true };

  registerTool({
    name: "search-events",
    title: title("search-events"),
    description: "Search cultural events in Catalonia by keyword. Returns matching events with title, dates, location and URL.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search keywords (e.g. jazz Barcelona)" },
        page: { type: "integer", description: "Page number (0-indexed, default 0)" },
        size: { type: "integer", description: "Results per page (default 15, max 50)" }
      },
      required: ["query"]
    },
    annotations: readOnly,
    execute: function (input) {
      var p = new URLSearchParams();
      p.set("term", String(input.query || ""));
      if (input.page != null) p.set("page", String(input.page));
      if (input.size != null) p.set("size", String(input.size));
      return getJson("/api/events?" + p);
    }
  });

  registerTool({
    name: "get-event-details",
    title: title("get-event-details"),
    description: "Get the full details of one event by its slug: title, description, dates, location, image and category.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Event slug (the last part of an /e/{slug} URL)" }
      },
      required: ["slug"]
    },
    annotations: readOnly,
    execute: function (input) {
      return getJson("/api/events/" + encodeURIComponent(String(input.slug || "")));
    }
  });

  registerTool({
    name: "get-categories",
    title: title("get-categories"),
    description: "List all event categories (concerts, theatre, exhibitions, festivals and more).",
    inputSchema: { type: "object", properties: {} },
    annotations: readOnly,
    execute: function () {
      return getJson("/api/categories");
    }
  });

  registerTool({
    name: "get-places",
    title: title("get-places"),
    description: "List the places (towns, cities and regions) in Catalonia that have events.",
    inputSchema: { type: "object", properties: {} },
    annotations: readOnly,
    execute: function () {
      return getJson("/api/places");
    }
  });

  registerTool({
    name: "get-events-by-place",
    title: title("get-events-by-place"),
    description: "Get cultural events for one place (town or city) in Catalonia, optionally filtered by category and date.",
    inputSchema: {
      type: "object",
      properties: {
        place: { type: "string", description: "Place slug (e.g. barcelona, girona, tarragona)" },
        category: { type: "string", description: "Category slug (e.g. concerts, teatre, exposicions)" },
        byDate: { type: "string", enum: ["avui", "dema", "setmana", "cap-de-setmana"], description: "Date range: today, tomorrow, this week or this weekend" },
        page: { type: "integer", description: "Page number (0-indexed, default 0)" }
      },
      required: ["place"]
    },
    annotations: readOnly,
    execute: function (input) {
      var p = new URLSearchParams();
      p.set("place", String(input.place || ""));
      if (input.category) p.set("category", String(input.category));
      if (input.byDate) p.set("byDate", String(input.byDate));
      if (input.page != null) p.set("page", String(input.page));
      return getJson("/api/events?" + p);
    }
  });
})();
