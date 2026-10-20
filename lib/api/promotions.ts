import { connection } from "next/server";
import { captureException } from "@sentry/nextjs";
import type { z } from "zod";
import { fetchWithHmac } from "./fetch-wrapper";
import { requireAuth } from "./events";
import { getApiUrl, isApiUrlConfigured } from "@utils/api-helpers";
import { getAccessTokenFromCookies } from "@utils/auth-cookies";
import { createKeyedCache } from "@lib/api/cache";
import { parseEventSummaryList } from "@lib/validation/event";
import {
  PromotionCheckoutSchema,
  PromotionOptionsSchema,
  PromotionStatusSchema,
} from "@lib/validation/promotion";
import type { EventSummaryResponseDTO } from "types/api/event";
import type {
  PromotedEventsQuery,
  PromotionCheckoutResponseDTO,
  PromotionOptionsDTO,
  PromotionResult,
  PromotionStatusDTO,
} from "types/api/promotion";

const PROMOTED_EVENTS_SIZE = 8;
// The backend reshuffles promoted events every 5 minutes; one call per minute
// per placement and process keeps listing renders off the backend.
const { cache: promotedEventsCache } =
  createKeyedCache<EventSummaryResponseDTO[]>(60_000);

// Promotion errors are `{ status, code }`. Spring Security rejections (bad
// Bearer, missing role) carry no body, so fall back on the HTTP status.
async function readPromotionErrorCode(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { code?: unknown };
    if (typeof body.code === "string") return body.code;
  } catch {
    // empty or non-JSON body
  }
  if (response.status === 401) return "AUTHENTICATION_REQUIRED";
  if (response.status === 403) return "NOT_EVENT_OWNER";
  return "UNKNOWN";
}

// Server Components can't write cookies, so they must not refresh the access
// token: Logto would rotate the refresh token and the new one would be lost.
// Renders read the cookie token only; RefreshSession refreshes through a
// server action and re-renders.
async function getAuth(
  canRefresh: boolean,
): Promise<{ apiUrl: string; authToken: string } | null> {
  if (canRefresh) {
    try {
      return await requireAuth();
    } catch (error) {
      if ((error as { status?: number }).status !== 401) throw error;
      return null;
    }
  }
  if (!isApiUrlConfigured()) throw new Error("NEXT_PUBLIC_API_URL is not set");
  const authToken = await getAccessTokenFromCookies();
  return authToken ? { apiUrl: getApiUrl(), authToken } : null;
}

async function promotionRequest<T>(
  eventId: string,
  path: "options" | "status" | "checkout",
  schema: z.ZodType<T>,
  init: { method?: "POST"; headers?: Record<string, string>; body?: string } = {},
): Promise<PromotionResult<T>> {
  try {
    const auth = await getAuth(init.method === "POST");
    if (!auth) return { ok: false, code: "AUTHENTICATION_REQUIRED" };

    const response = await fetchWithHmac(
      `${auth.apiUrl}/events/${encodeURIComponent(eventId)}/promotions/${path}`,
      {
        method: init.method ?? "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${auth.authToken}`,
          ...init.headers,
        },
        body: init.body,
        skipBodySigning: true,
      },
    );

    if (!response.ok) {
      const code = await readPromotionErrorCode(response);
      console.error(`promotions/${path}: HTTP ${response.status} ${code}`);
      return { ok: false, code };
    }
    const parsed = schema.safeParse(await response.json());
    if (!parsed.success) {
      console.error(`promotions/${path}: invalid response`);
      captureException(parsed.error, {
        tags: { section: "promotions", type: "validation-failed", endpoint: path },
      });
      return { ok: false, code: "UNKNOWN" };
    }
    return { ok: true, data: parsed.data };
  } catch (error) {
    // Missing API config, timeouts and malformed bodies must not turn the
    // payment pages into a 500.
    console.error(`promotions/${path}: request failed`, error);
    return { ok: false, code: "UNKNOWN" };
  }
}

export function getPromotionOptions(
  eventId: string,
): Promise<PromotionResult<PromotionOptionsDTO>> {
  return promotionRequest(eventId, "options", PromotionOptionsSchema);
}

export function getPromotionStatus(
  eventId: string,
): Promise<PromotionResult<PromotionStatusDTO>> {
  return promotionRequest(eventId, "status", PromotionStatusSchema);
}

/**
 * The Idempotency-Key must stay the same across retries of one purchase, so
 * the caller (the browser) owns it; the backend returns the same pending
 * Stripe session for a repeated key.
 */
export function createPromotionCheckout(
  eventId: string,
  optionId: string,
  idempotencyKey: string,
): Promise<PromotionResult<PromotionCheckoutResponseDTO>> {
  return promotionRequest(eventId, "checkout", PromotionCheckoutSchema, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ optionId }),
  });
}

/** The browser is sent to checkout URLs; accept only Stripe Checkout over https. */
export function isStripeCheckoutUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === "checkout.stripe.com";
  } catch {
    return false;
  }
}

export function buildPromotedEventsQuery(query: PromotedEventsQuery): string {
  const params = new URLSearchParams({
    placement: query.placement,
    size: String(PROMOTED_EVENTS_SIZE),
  });
  if (query.placement === "CITY") params.set("cityId", String(query.cityId));
  if (query.placement === "REGION") params.set("regionId", String(query.regionId));
  if (query.placement === "PROVINCE") {
    params.set("provinceId", String(query.provinceId));
  }
  return params.toString();
}

/** GET /api/events/promoted — public, plain array. Fails soft to []. */
export async function fetchPromotedEvents(
  query: PromotedEventsQuery,
): Promise<EventSummaryResponseDTO[]> {
  // Always a dynamic hole: a warm cache hit must not let the row get baked
  // into a prerendered shell (fetchWithHmac's own connection() is skipped).
  await connection();
  if (!isApiUrlConfigured()) return [];
  return promotedEventsCache(buildPromotedEventsQuery(query), fetchPromotedEventsApi);
}

async function fetchPromotedEventsApi(
  key: string | number,
): Promise<EventSummaryResponseDTO[]> {
  try {
    // No `next: { revalidate }`: external fetches stay no-store (see
    // docs/incidents/2026-01-20-fetch-cache-explosion.md).
    const response = await fetchWithHmac(
      `${getApiUrl()}/events/promoted?${key}`,
      { headers: { Accept: "application/json" } },
    );
    if (!response.ok) {
      console.warn(`fetchPromotedEvents: HTTP ${response.status}`);
      return [];
    }
    return parseEventSummaryList(await response.json());
  } catch (error) {
    console.warn("fetchPromotedEvents: fetch failed", error);
    return [];
  }
}
