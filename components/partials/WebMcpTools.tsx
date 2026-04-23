"use client";

import { useEffect } from "react";

/**
 * Registers WebMCP tools so AI agents can discover and invoke
 * site actions (search, categories, places, event details) via
 * navigator.modelContext.registerTool().
 *
 * @see https://webmachinelearning.github.io/webmcp/
 */
export default function WebMcpTools() {
  useEffect(() => {
    const mc = navigator.modelContext;
    if (!mc) return;

    const ac = new AbortController();
    const opts = { signal: ac.signal };
    const base = window.location.origin;

    mc.registerTool(
      {
        name: "search-events",
        title: "Search Events",
        description:
          "Search for cultural events in Catalonia by keyword. Returns a list of matching events with title, date, location, and URL.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search keywords (e.g. 'jazz Barcelona')",
            },
            page: {
              type: "integer",
              description: "Page number (0-indexed, default 0)",
            },
            size: {
              type: "integer",
              description: "Results per page (default 15, max 50)",
            },
          },
          required: ["query"],
        },
        annotations: { readOnlyHint: true },
        async execute(input: Record<string, unknown>) {
          const params = new URLSearchParams();
          params.set("term", String(input.query ?? ""));
          if (input.page != null) params.set("page", String(input.page));
          if (input.size != null) params.set("size", String(input.size));
          const res = await fetch(`${base}/api/events?${params}`);
          return res.json();
        },
      },
      opts,
    );

    mc.registerTool(
      {
        name: "get-event-details",
        title: "Get Event Details",
        description:
          "Get full details for a single event by its slug. Returns title, description, dates, location, image, and category.",
        inputSchema: {
          type: "object",
          properties: {
            slug: {
              type: "string",
              description: "Event slug identifier (from event URL)",
            },
          },
          required: ["slug"],
        },
        annotations: { readOnlyHint: true },
        async execute(input: Record<string, unknown>) {
          const res = await fetch(
            `${base}/api/events/${encodeURIComponent(String(input.slug))}`,
          );
          return res.json();
        },
      },
      opts,
    );

    mc.registerTool(
      {
        name: "get-categories",
        title: "List Categories",
        description:
          "List all available event categories (concerts, theatre, exhibitions, festivals, etc.).",
        inputSchema: { type: "object", properties: {} },
        annotations: { readOnlyHint: true },
        async execute() {
          const res = await fetch(`${base}/api/categories`);
          return res.json();
        },
      },
      opts,
    );

    mc.registerTool(
      {
        name: "get-places",
        title: "List Places",
        description:
          "List available places (cities and towns) in Catalonia that have events.",
        inputSchema: { type: "object", properties: {} },
        annotations: { readOnlyHint: true },
        async execute() {
          const res = await fetch(`${base}/api/places`);
          return res.json();
        },
      },
      opts,
    );

    mc.registerTool(
      {
        name: "get-events-by-place",
        title: "Get Events by Place",
        description:
          "Get cultural events for a specific place (city or town) in Catalonia. Supports filtering by category and date range.",
        inputSchema: {
          type: "object",
          properties: {
            place: {
              type: "string",
              description:
                "Place slug (e.g. 'barcelona', 'girona', 'tarragona')",
            },
            category: {
              type: "string",
              description:
                "Category slug to filter by (e.g. 'concerts', 'teatre', 'exposicions')",
            },
            page: {
              type: "integer",
              description: "Page number (0-indexed, default 0)",
            },
          },
          required: ["place"],
        },
        annotations: { readOnlyHint: true },
        async execute(input: Record<string, unknown>) {
          const params = new URLSearchParams();
          params.set("place", String(input.place ?? ""));
          if (input.category)
            params.set("category", String(input.category));
          if (input.page != null) params.set("page", String(input.page));
          const res = await fetch(`${base}/api/events?${params}`);
          return res.json();
        },
      },
      opts,
    );

    return () => ac.abort();
  }, []);

  return null;
}

