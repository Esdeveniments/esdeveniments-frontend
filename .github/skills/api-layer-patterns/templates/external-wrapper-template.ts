/**
 * External API Wrapper Template
 *
 * Copy this template when adding a new external API wrapper.
 * Replace RESOURCE_NAME placeholders with your resource name.
 *
 * Location: lib/api/RESOURCE_NAME-external.ts
 *
 * NOTE: This is a documentation template. When implementing, use these imports:
 * - import { fetchWithHmac } from "@utils/api";
 * - import { captureException } from "@sentry/nextjs";
 * - import { RESOURCE_NAMEResponseSchema } from "@lib/validation/RESOURCE_NAME"; // Optional Zod schema
 */

// Mock functions for template validation
declare function fetchWithHmac(url: string): Promise<Response>;
declare function captureException(
  error: unknown,
  context?: { tags?: Record<string, string>; extra?: Record<string, unknown> }
): void;

// Type definitions - ideally import from types/api/RESOURCE_NAME.ts
interface RESOURCE_NAMEParams {
  page?: number;
  size?: number;
  // Add other params
}

interface RESOURCE_NAMEDTO {
  id: string;
  // Add other fields
}

interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  last: boolean;
}

// Environment guard - CRITICAL for preventing build failures
const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Fetch RESOURCE_NAME from external API
 *
 * @param params - Query parameters
 * @returns Paged response with RESOURCE_NAME data, or empty fallback on error
 */
export async function fetchRESOURCE_NAME(
  params: RESOURCE_NAMEParams = {}
): Promise<PagedResponse<RESOURCE_NAMEDTO>> {
  // Environment guard - return safe fallback if API URL not configured
  if (!API_URL) {
    console.warn("[fetchRESOURCE_NAME] API URL not configured");
    return {
      content: [],
      totalElements: 0,
      totalPages: 0,
      currentPage: 0,
      pageSize: 20,
      last: true,
    };
  }

  try {
    // Build query string
    const searchParams = new URLSearchParams();
    if (params.page !== undefined)
      searchParams.set("page", String(params.page));
    if (params.size !== undefined)
      searchParams.set("size", String(params.size));
    // Add more params as needed

    const queryString = searchParams.toString();
    const url = `${API_URL}/api/RESOURCE_NAME${
      queryString ? `?${queryString}` : ""
    }`;

    // Fetch with HMAC signing and timeout
    const response = await fetchWithHmac(url);

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Optional: Validate with Zod schema
    // const validated = RESOURCE_NAMEResponseSchema.safeParse(data);
    // if (!validated.success) {
    //   console.error("[fetchRESOURCE_NAME] Validation error:", validated.error);
    //   throw new Error("Invalid API response");
    // }
    // return validated.data;

    return data;
  } catch (error) {
    // Log to Sentry with context
    captureException(error, {
      tags: { api: "RESOURCE_NAME" },
      extra: { params },
    });

    console.error("[fetchRESOURCE_NAME] Error:", error);

    // Return safe fallback - never throw for read endpoints
    return {
      content: [],
      totalElements: 0,
      totalPages: 0,
      currentPage: 0,
      pageSize: 20,
      last: true,
    };
  }
}

/**
 * Fetch single RESOURCE_NAME by ID/slug
 */
export async function fetchRESOURCE_NAMEById(
  id: string
): Promise<RESOURCE_NAMEDTO | null> {
  if (!API_URL) {
    console.warn("[fetchRESOURCE_NAMEById] API URL not configured");
    return null;
  }

  try {
    const url = `${API_URL}/api/RESOURCE_NAME/${encodeURIComponent(id)}`;
    const response = await fetchWithHmac(url);

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    captureException(error, {
      tags: { api: "RESOURCE_NAME" },
      extra: { id },
    });

    console.error("[fetchRESOURCE_NAMEById] Error:", error);
    return null;
  }
}
