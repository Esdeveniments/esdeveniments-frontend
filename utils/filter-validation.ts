import { z } from "zod";
import { FILTER_CONFIGURATIONS } from "config/filters";
import { FilterOperations } from "./filter-operations";

// Dynamic schema generation based on configuration
const createFilterSchema = () => {
  const schemaObject: Record<string, z.ZodTypeAny> = {};

  FILTER_CONFIGURATIONS.forEach((config) => {
    switch (config.type) {
      case "place":
      case "category":
      case "date":
        schemaObject[config.key] = z.string().min(1);
        break;
      case "search":
        schemaObject[config.key] = z.string();
        break;
      case "distance":
        schemaObject[config.key] = z.number().min(1).max(200);
        break;
      case "coordinates":
        if (config.key === "lat") {
          schemaObject[config.key] = z.number().min(-90).max(90).optional();
        } else if (config.key === "lon") {
          schemaObject[config.key] = z.number().min(-180).max(180).optional();
        }
        break;
    }
  });

  return z.object(schemaObject);
};

// Static schemas for specific use cases
export const URLFilterSchema = createFilterSchema();

export const QueryParamsSchema = z.object({
  search: z.string().optional(),
  distance: z.string().regex(/^\d+$/).optional(),
  lat: z
    .string()
    .regex(/^-?\d+\.?\d*$/)
    .optional(),
  lon: z
    .string()
    .regex(/^-?\d+\.?\d*$/)
    .optional(),
});

/**
 * Configuration-driven filter validation and parsing
 */
export function validateAndSanitizeFilters(input: unknown) {
  try {
    return URLFilterSchema.parse(input);
  } catch (error) {
    console.warn("Invalid filter state, using defaults:", error);
    return getDefaultFilterState();
  }
}

function getDefaultFilterState() {
  return FilterOperations.getDefaultFilterState();
}

/**
 * Safe URL parsing with validation
 */
export function parseFiltersFromUrlSafe(
  segments: { place?: string; date?: string; category?: string },
  searchParams: URLSearchParams
) {
  try {
    // Validate query params first
    const queryResult = QueryParamsSchema.safeParse({
      search: searchParams.get("search"),
      distance: searchParams.get("distance"),
      lat: searchParams.get("lat"),
      lon: searchParams.get("lon"),
    });

    if (!queryResult.success) {
      console.warn("Invalid query params:", queryResult.error);
      return getDefaultFilterState();
    }

    // Build filter state from segments and validated query params
    const filterState = {
      place: segments.place || "catalunya",
      byDate: segments.date || "tots",
      category: segments.category || "tots",
      searchTerm: queryResult.data.search || "",
      distance: queryResult.data.distance
        ? parseInt(queryResult.data.distance)
        : 50,
      lat: queryResult.data.lat ? parseFloat(queryResult.data.lat) : undefined,
      lon: queryResult.data.lon ? parseFloat(queryResult.data.lon) : undefined,
    };

    // Validate the complete filter state
    return validateAndSanitizeFilters(filterState);
  } catch (error) {
    console.error("Error parsing filters from URL:", error);
    return getDefaultFilterState();
  }
}
