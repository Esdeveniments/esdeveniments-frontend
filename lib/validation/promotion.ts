import { z } from "zod";
import type {
  PromotionCheckoutResponseDTO,
  PromotionOptionsDTO,
  PromotionStatusDTO,
} from "types/api/promotion";

const placement = z.enum(["CITY", "REGION", "PROVINCE", "CATALONIA"]);
const instant = z.string().datetime({ offset: true });
const locationId = z.number().int().positive().nullable();

export const PromotionOptionsSchema = z.object({
  options: z.array(
    z.object({
      id: z.string().min(1),
      scope: placement,
      durationDays: z.number().int().positive(),
      amountMinor: z.number().int().nonnegative(),
      currency: z.string().regex(/^[A-Z]{3}$/),
      taxIncluded: z.boolean(),
      available: z.boolean(),
      unavailableReason: z.string().nullable(),
    }),
  ),
  canPurchase: z.boolean(),
  unavailableReason: z.string().nullable(),
  cityId: locationId,
  regionId: locationId,
  provinceId: locationId,
  eventEndsAt: instant,
}) satisfies z.ZodType<PromotionOptionsDTO>;

export const PromotionStatusSchema = z.object({
  orderId: z.string().uuid().nullable(),
  paymentStatus: z.enum([
    "NONE", "PENDING", "PAID", "EXPIRED", "FAILED", "REFUND_PENDING", "REFUNDED",
  ]),
  promotionStatus: z.enum(["NONE", "ACTIVE", "EXPIRED", "REVOKED"]),
  scope: placement.nullable(),
  startsAt: instant.nullable(),
  endsAt: instant.nullable(),
  canPurchase: z.boolean(),
  checkoutUrl: z.string().url().nullable(),
}) satisfies z.ZodType<PromotionStatusDTO>;

export const PromotionCheckoutSchema = z.object({
  orderId: z.string().uuid(),
  url: z.string().url(),
}) satisfies z.ZodType<PromotionCheckoutResponseDTO>;
