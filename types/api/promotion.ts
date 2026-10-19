// Backend promotion contract (esdeveniments-backend `checkout` package, 2026-10-18).
// `{eventId}` in every promotion path is the event UUID, never the slug.

export type PromotionPlacement = "CITY" | "REGION" | "PROVINCE" | "CATALONIA";

/** Plain strings on the backend (not an enum); listed for exhaustive UI copy. */
export type PromotionPaymentStatus =
  | "NONE"
  | "PENDING"
  | "PAID"
  | "EXPIRED"
  | "FAILED"
  | "REFUND_PENDING"
  | "REFUNDED";

export type PromotionStatusValue = "NONE" | "ACTIVE" | "EXPIRED" | "REVOKED";

/** GET /api/events/{eventId}/promotions/options → options[] */
export interface PromotionOptionDTO {
  id: string; // e.g. "city-7d"
  scope: PromotionPlacement;
  durationDays: number;
  amountMinor: number; // cents
  currency: string; // "EUR"
  taxIncluded: boolean;
  available: boolean;
  unavailableReason: string | null;
}

/** GET /api/events/{eventId}/promotions/options */
export interface PromotionOptionsDTO {
  options: PromotionOptionDTO[];
  canPurchase: boolean;
  unavailableReason: string | null;
  cityId: number | null;
  regionId: number | null;
  provinceId: number | null;
  eventEndsAt: string; // ISO instant
}

/** GET /api/events/{eventId}/promotions/status */
export interface PromotionStatusDTO {
  orderId: string | null;
  paymentStatus: PromotionPaymentStatus;
  promotionStatus: PromotionStatusValue;
  scope: PromotionPlacement | null;
  startsAt: string | null;
  endsAt: string | null;
  canPurchase: boolean;
  checkoutUrl: string | null;
}

/** POST /api/events/{eventId}/promotions/checkout response */
export interface PromotionCheckoutResponseDTO {
  orderId: string;
  url: string;
}

/** GET /api/events/promoted query. CATALONIA takes no id; the rest take exactly one. */
export type PromotedEventsQuery =
  | { placement: "CATALONIA" }
  | { placement: "CITY"; cityId: number }
  | { placement: "REGION"; regionId: number }
  | { placement: "PROVINCE"; provinceId: number };

/** Backend codes that have localized copy under App.EventPromote.errors. */
export type PromotionCopyCode =
  keyof (typeof import("../../messages/ca.json"))["App"]["EventPromote"]["errors"];

/** Promotion calls never throw to the UI: failures carry the backend `code`. */
export type PromotionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string };
