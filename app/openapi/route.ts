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
    "x-rateLimit": {
      description: "60 requests per minute per IP. Returns 429 with Retry-After header when exceeded.",
      limit: 60,
      window: "1 minute",
    },
    externalDocs: {
      description: "LLM-friendly documentation and quickstart guide",
      url: `${siteUrl}/llms.txt`,
    },
    tags: [
      {
        name: "Events",
        description: "Cultural events in Catalonia — concerts, theatre, exhibitions, festivals, and more",
      },
      {
        name: "News",
        description: "Local news about events and culture in Catalonia",
      },
      {
        name: "Reference",
        description: "Categories, places, regions, and cities",
      },
    ],
    paths: {
      "/api/events": {
        get: {
          operationId: "listEvents",
          tags: ["Events"],
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
                  example: {
                    content: [
                      {
                        id: 12345,
                        title: "Festival de Jazz de Barcelona",
                        slug: "festival-de-jazz-de-barcelona",
                        description: "Annual jazz festival in Barcelona",
                        startDate: "2026-07-01T20:00:00Z",
                        endDate: "2026-07-15T23:00:00Z",
                        location: "Barcelona",
                        category: "concerts",
                      },
                    ],
                    currentPage: 0,
                    pageSize: 15,
                    totalElements: 342,
                    totalPages: 23,
                    last: false,
                  },
                },
              },
            },
            "429": {
              description: "Rate limit exceeded (60 req/min/IP)",
              headers: {
                "Retry-After": {
                  schema: { type: "integer" },
                  description: "Seconds to wait before retrying",
                },
              },
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                  example: { error: "Rate limit exceeded", status: 429 },
                },
              },
            },
          },
        },
      },
      "/api/events/{slug}": {
        get: {
          operationId: "getEvent",
          tags: ["Events"],
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
            "404": {
              description: "Event not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                  example: { error: "Event not found", status: 404 },
                },
              },
            },
            "429": {
              description: "Rate limit exceeded",
              headers: { "Retry-After": { schema: { type: "integer" }, description: "Seconds to wait" } },
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "500": {
              description: "Internal server error",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
          },
        },
      },
      "/api/news": {
        get: {
          operationId: "listNews",
          tags: ["News"],
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
          tags: ["News"],
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
            "404": {
              description: "Article not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/categories": {
        get: {
          operationId: "listCategories",
          tags: ["Reference"],
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
            "429": {
              description: "Rate limit exceeded",
              headers: { "Retry-After": { schema: { type: "integer" }, description: "Seconds to wait" } },
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "500": {
              description: "Internal server error",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
          },
        },
      },
      "/api/places": {
        get: {
          operationId: "listPlaces",
          tags: ["Reference"],
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
            "429": {
              description: "Rate limit exceeded",
              headers: { "Retry-After": { schema: { type: "integer" }, description: "Seconds to wait" } },
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "500": {
              description: "Internal server error",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
          },
        },
      },
      "/api/places/{slug}": {
        get: {
          operationId: "getPlace",
          tags: ["Reference"],
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
            "404": {
              description: "Place not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/regions": {
        get: {
          operationId: "listRegions",
          tags: ["Reference"],
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
            "429": {
              description: "Rate limit exceeded",
              headers: { "Retry-After": { schema: { type: "integer" }, description: "Seconds to wait" } },
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "500": {
              description: "Internal server error",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
          },
        },
      },
      "/api/cities": {
        get: {
          operationId: "listCities",
          tags: ["Reference"],
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
            "429": {
              description: "Rate limit exceeded",
              headers: { "Retry-After": { schema: { type: "integer" }, description: "Seconds to wait" } },
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "500": {
              description: "Internal server error",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        PagedEvents: {
          type: "object",
          required: ["content", "currentPage", "pageSize", "totalElements", "totalPages", "last"],
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
          required: ["id", "title", "slug"],
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
          required: ["id", "title", "slug"],
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
          required: ["content", "currentPage", "pageSize", "totalElements", "totalPages", "last"],
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
          required: ["id", "title", "slug"],
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
          required: ["id", "title", "slug"],
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
          required: ["id", "name", "slug"],
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            slug: { type: "string" },
          },
        },
        Place: {
          type: "object",
          required: ["id", "name", "slug", "type"],
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
          required: ["id", "name", "slug", "type"],
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
          required: ["id", "name", "slug"],
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            slug: { type: "string" },
          },
        },
        City: {
          type: "object",
          required: ["id", "name", "slug"],
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            slug: { type: "string" },
            latitude: { type: "number" },
            longitude: { type: "number" },
            postalCode: { type: "string" },
          },
        },
        ErrorResponse: {
          type: "object",
          required: ["error"],
          properties: {
            error: { type: "string", description: "Human-readable error message" },
            status: { type: "integer", description: "HTTP status code" },
            retryAfter: {
              type: "integer",
              description: "Seconds to wait before retrying (only on 429)",
            },
          },
          example: { error: "Not found", status: 404 },
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
