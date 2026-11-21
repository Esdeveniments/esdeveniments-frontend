import type { CategorySummaryResponseDTO } from "./category";
import type { Option } from "../common";
import type { EventPriceType, FormData } from "../event";

export type AiGatewayMessagePart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface AiGatewayMessage {
  role: "system" | "user" | "assistant";
  content: string | AiGatewayMessagePart[];
}

export interface AiGatewayCompletionOptions {
  cascade?: string;
  messages: AiGatewayMessage[];
  schema?: Record<string, unknown>;
  schemaName?: string;
  temperature?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export type AiGatewayCompletionResult =
  | { ok: true; content: string; model: string | null }
  | {
      ok: false;
      reason: "not_configured" | "timeout" | "upstream_error" | "aborted";
      status: number | null;
      message: string;
    };

export interface PosterPriceResolution {
  priceType: EventPriceType;
  priceAmount: string;
  originalPrice: string | null;
  needsReview: boolean;
}

export interface PosterExtractedEvent {
  title: string | null;
  description: string | null;
  /** "YYYY-MM-DDTHH:mm" in Europe/Madrid local wall time, or null when not readable. */
  startDate: string | null;
  /** "YYYY-MM-DDTHH:mm" in Europe/Madrid local wall time, or null when not readable. */
  endDate: string | null;
  isAllDay: boolean;
  /** True when the year was inferred rather than printed on the poster. */
  dateInferred: boolean;
  /** True when the poster describes a multi-event festival or programme. */
  isMultiEvent: boolean;
  /** Municipality name in Catalonia as read from the poster. */
  town: string | null;
  /** Specific venue or street address without duplicating town/region. */
  location: string | null;
  /** Normalized http/https event or ticket URL printed on the poster. */
  url: string | null;
  /** Literal price text visible on the poster (or null if none printed). */
  price: string | null;
  /** Deterministic price resolution derived from `price`. */
  priceResolution: PosterPriceResolution | null;
  /** Matched category slugs (at most 3). */
  categories: string[];
}

export type PosterExtractionErrorCode =
  | "not_configured"
  | "unauthorized"
  | "rate_limited"
  | "overloaded"
  | "invalid_image"
  | "too_large"
  | "upstream_timeout"
  | "upstream_error"
  | "model_rejected"
  | "no_event_data"
  | "network_error";

export type PosterAvailabilityState =
  | "available"
  | "account_limit"
  | "app_limit"
  | "disabled";

export interface PosterExtractionStatusResponse {
  state: PosterAvailabilityState;
  signedIn: boolean;
  retryAfterSec?: number;
}

export interface PosterExtractionApiSuccess {
  extracted: PosterExtractedEvent;
  hasData: boolean;
  model: string | null;
}

export interface PosterExtractionApiError {
  error: string;
  code: PosterExtractionErrorCode;
  retryAfterSec?: number;
}

export type PosterAutofillFieldKey =
  | "title"
  | "description"
  | "url"
  | "town"
  | "location"
  | "categories"
  | "dates"
  | "price";

export interface PosterAutofillApplyOptions {
  currentForm: FormData;
  extracted: PosterExtractedEvent;
  cityOptions: Option[];
  cityToRegionOptionMap: Record<string, Option>;
  categories: CategorySummaryResponseDTO[];
  autoDates: boolean;
  /** Fields the user has manually touched (protected even if edited away and back). */
  userOwnedFields?: ReadonlySet<PosterAutofillFieldKey>;
  preserveUserValues?: boolean;
}

export interface PosterAutofillApplyResult {
  nextForm: FormData;
  filledFields: PosterAutofillFieldKey[];
  skippedFields: PosterAutofillFieldKey[];
  unmatchedTown: string | null;
  appliedDates: boolean;
}

/**
 * Revision-based Undo record: stores the exact pre-autofill values per field
 * group plus the set of fields still owned by that autofill run. Editing any
 * field removes it from `ownedFields`, so Undo never wipes post-autofill edits.
 */
export interface PosterAutofillUndoRecord {
  runId: number;
  ownedFields: ReadonlySet<PosterAutofillFieldKey>;
  previousForm: FormData;
  previousAutoDates: boolean;
}

export interface PosterScanIntentRecord {
  intentId: string;
  createdAt: number;
}

export interface PosterNormalizedImage {
  ok: true;
  buffer: Buffer;
  mimeType: "image/jpeg";
  width: number;
  height: number;
}

export interface PosterNormalizeImageFailure {
  ok: false;
  reason: "overloaded" | "invalid_image";
}

export type PosterNormalizeImageResult =
  | PosterNormalizedImage
  | PosterNormalizeImageFailure;

export interface PosterQuotaAdmission {
  allowed: boolean;
  reason?: "attempt_limit" | "account_limit" | "app_limit";
  retryAfterSec?: number;
  /** Europe/Madrid YYYY-MM-DD day key charged, carried to refunds across midnight. */
  chargedDay?: string;
}

export interface PosterLeaseHandle {
  accountId: string;
  sequence: number;
  signal: AbortSignal;
  release: () => void;
}

export interface PosterQuotaCounterRecord {
  count: number;
  resetAt: number;
}

export interface PosterActiveLease {
  accountId: string;
  sequence: number;
  controller: AbortController;
  expiresAt: number;
}

export interface PosterHighWaterEntry {
  sequence: number;
  expiresAt: number;
}
