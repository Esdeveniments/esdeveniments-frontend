import { NextResponse } from "next/server";
import { siteUrl } from "@config/index";

/**
 * OpenAPI 3.1.0 specification for public API endpoints.
 * Accessible at /openapi.json (via proxy.ts rewrite) or /openapi.
 */
export async function GET() {
  const spec = {
    openapi: "3.1.0",
    info: {
      title: "Esdeveniments.cat API",
      version: "1.0.0",
      description:
        "Public API for discovering cultural events, news, places, and categories in Catalonia (Spain). Multilingual support (ca/es/en). All GET endpoints are public and require no authentication.",
      contact: {
        name: "Esdeveniments.cat",
        url: `${siteUrl}/qui-som`,
      },
      license: {
        name: "Proprietary",
        url: `${siteUrl}/termes-servei`,
      },
    },
    servers: [{ url: siteUrl, description: "Production" }],
    paths: {
      "/api/events": {
        get: {
          operationId: "listEvents",
          summary: "List cultural events",
          description:
            "Search and browse cultural events in Catalonia. Supports filtering by place, category, date, location radius, and text search. Returns paginated results.",
          parameters: [
            {
              name: "page",
              in: "query",
              schema: { type: "integer", minimum: 0, default: 0 },
              description: "Page number (0-indexed)",
            },
            {
              name: "size",
              in: "query",
              schema: {
                type: "integer",
                minimum: 1,
                maximum: 50,
                default: 15,
              },
              description: "Results per page",
            },
            {
              name: "place",
              in: "query",
              schema: { type: "string" },
              description:
                "Place slug (e.g. 'barcelona', 'girona', 'tarragona')",
            },
            {
              name: "category",
              in: "query",
              schema: { type: "string" },
              description:
                "Category slug (e.g. 'concerts', 'teatre', 'exposicions')",
            },
            {
              name: "byDate",
              in: "query",
              schema: {
                type: "string",
                enum: ["avui", "dema", "setmana", "cap-de-setmana"],
              },
              description: "Date shortcut filter",
            },
            {
              name: "from",
              in: "query",
              schema: { type: "string", format: "date" },
              description: "Start date (YYYY-MM-DD)",
            },
            {
              name: "to",
              in: "query",
              schema: { type: "string", format: "date" },
              description: "End date (YYYY-MM-DD)",
            },
            {
              name: "term",
              in: "query",
              schema: { type: "string" },
              description: "Free-text search term",
            },
            {
              name: "lat",
              in: "query",
              schema: { type: "number", format: "float" },
              description: "Latitude for radius search",
            },
            {
              name: "lon",
              in: "query",
              schema: { type: "number", format: "float" },
              description: "Longitude for radius search",
            },
            {
              name: "radius",
              in: "query",
              schema: { type: "number", format: "float" },
              description: "Search radius in km (requires lat/lon)",
            },
          ],
          responses: {
            "200": {
              description: "Paginated event list",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/PagedEvents" },
                },
              },
            },
          },
        },
      },
      "/api/events/{slug}": {
        get: {
          operationId: "getEvent",
          summary: "Get event details",
          description:
            "Retrieve full details for a single event by its slug or ID.",
          parameters: [
            {
              name: "slug",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Event slug or numeric ID",
            },
          ],
          responses: {
            "200": {
              description: "Event details",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/EventDetail" },
                },
              },
            },
            "404": { description: "Event not found" },
          },
        },
      },
      "/api/news": {
        get: {
          operationId: "listNews",
          summary: "List news articles",
          description:
            "Browse local news about events and culture in Catalonia. Optionally filter by place.",
          parameters: [
            {
              name: "page",
              in: "query",
              schema: { type: "integer", minimum: 0, default: 0 },
            },
            {
              name: "size",
              in: "query",
              schema: {
                type: "integer",
                minimum: 1,
                maximum: 50,
                default: 15,
              },
            },
            {
              name: "place",
              in: "query",
              schema: { type: "string" },
              description: "Filter news by place slug",
            },
          ],
          responses: {
            "200": {
              description: "Paginated news list",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/PagedNews" },
                },
              },
            },
          },
        },
      },
      "/api/news/{slug}": {
        get: {
          operationId: "getNewsArticle",
          summary: "Get news article details",
          parameters: [
            {
              name: "slug",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "News article details",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/NewsDetail" },
                },
              },
            },
            "404": { description: "Article not found" },
          },
        },
      },
      "/api/categories": {
        get: {
          operationId: "listCategories",
          summary: "List all event categories",
          description: "Returns all available event categories with slugs.",
          responses: {
            "200": {
              description: "Category list",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Category" },
                  },
                },
              },
            },
          },
        },
      },
      "/api/places": {
        get: {
          operationId: "listPlaces",
          summary: "List all places",
          description:
            "Returns all towns, cities, and regions in Catalonia with their types.",
          responses: {
            "200": {
              description: "Place list",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Place" },
                  },
                },
              },
            },
          },
        },
      },
      "/api/places/{slug}": {
        get: {
          operationId: "getPlace",
          summary: "Get place details",
          parameters: [
            {
              name: "slug",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Place details",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/PlaceDetail" },
                },
              },
            },
            "404": { description: "Place not found" },
          },
        },
      },
      "/api/regions": {
        get: {
          operationId: "listRegions",
          summary: "List all regions (comarques)",
          responses: {
            "200": {
              description: "Region list",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Region" },
                  },
                },
              },
            },
          },
        },
      },
      "/api/cities": {
        get: {
          operationId: "listCities",
          summary: "List all cities",
          responses: {
            "200": {
              description: "City list",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/City" },
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        PagedEvents: {
          type: "object",
          properties: {
            content: {
              type: "array",
              items: { $ref: "#/components/schemas/EventSummary" },
            },
            currentPage: { type: "integer" },
            pageSize: { type: "integer" },
            totalElements: { type: "integer" },
            totalPages: { type: "integer" },
            last: { type: "boolean" },
          },
        },
        EventSummary: {
          type: "object",
          properties: {
            id: { type: "integer" },
            title: { type: "string" },
            slug: { type: "string" },
            description: { type: "string" },
            startDate: { type: "string", format: "date-time" },
            endDate: { type: "string", format: "date-time" },
            location: { type: "string" },
            imageUrl: { type: "string", format: "uri" },
            category: { type: "string" },
          },
        },
        EventDetail: {
          type: "object",
          properties: {
            id: { type: "integer" },
            title: { type: "string" },
            slug: { type: "string" },
            description: { type: "string" },
            startDate: { type: "string", format: "date-time" },
            endDate: { type: "string", format: "date-time" },
            location: { type: "string" },
            imageUrl: { type: "string", format: "uri" },
            category: { type: "string" },
            lat: { type: "number" },
            lon: { type: "number" },
            url: { type: "string", format: "uri" },
          },
        },
        PagedNews: {
          type: "object",
          properties: {
            content: {
              type: "array",
              items: { $ref: "#/components/schemas/NewsSummary" },
            },
            currentPage: { type: "integer" },
            pageSize: { type: "integer" },
            totalElements: { type: "integer" },
            totalPages: { type: "integer" },
            last: { type: "boolean" },
          },
        },
        NewsSummary: {
          type: "object",
          properties: {
            id: { type: "integer" },
            title: { type: "string" },
            slug: { type: "string" },
            summary: { type: "string" },
            imageUrl: { type: "string", format: "uri" },
            publishedAt: { type: "string", format: "date-time" },
          },
        },
        NewsDetail: {
          type: "object",
          properties: {
            id: { type: "integer" },
            title: { type: "string" },
            slug: { type: "string" },
            content: { type: "string" },
            imageUrl: { type: "string", format: "uri" },
            publishedAt: { type: "string", format: "date-time" },
          },
        },
        Category: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            slug: { type: "string" },
          },
        },
        Place: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            slug: { type: "string" },
            type: {
              type: "string",
              enum: ["PROVINCE", "REGION", "CITY"],
            },
          },
        },
        PlaceDetail: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            slug: { type: "string" },
            type: { type: "string" },
            latitude: { type: "number" },
            longitude: { type: "number" },
          },
        },
        Region: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            slug: { type: "string" },
          },
        },
        City: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            slug: { type: "string" },
            latitude: { type: "number" },
            longitude: { type: "number" },
            postalCode: { type: "string" },
          },
        },
      },
    },
  };

  return NextResponse.json(spec, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=86400",
    },
  });
}
