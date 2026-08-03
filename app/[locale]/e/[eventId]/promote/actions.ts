"use server";
import { createPromotionCheckout, fetchEventBySlug } from "@lib/api/events";
import { getCurrentUser } from "@lib/auth/session";
import { siteUrl } from "@config/index";
import { withLocalePath } from "@utils/i18n-seo";
import type { AppLocale } from "types/i18n";
import type { PromotionCheckoutResult } from "types/event";

/**
 * Resolves the event by slug and verifies the caller-provided eventId matches
 * — same double-check as editEvent (app/[locale]/e/[eventId]/edita/actions.ts)
 * to prevent a client passing a slug it owns alongside a different eventId.
 */
export async function createPromotionCheckoutAction(
  eventId: string,
  slug: string,
  locale: AppLocale,
): Promise<PromotionCheckoutResult> {
  const [currentUser, event] = await Promise.all([
    getCurrentUser(),
    fetchEventBySlug(slug),
  ]);

  if (!event) {
    return { success: false, error: "Event not found" };
  }

  if (event.id !== eventId) {
    return {
      success: false,
      error: "Unauthorized: only the event creator can promote this event",
    };
  }

  const isCreator = Boolean(
    currentUser?.id && event.owner?.id && currentUser.id === event.owner.id,
  );
  if (!isCreator) {
    return {
      success: false,
      error: "Unauthorized: only the event creator can promote this event",
    };
  }

  const successUrl = `${siteUrl}${withLocalePath(`/e/${slug}/promote/success`, locale)}`;
  const cancelUrl = `${siteUrl}${withLocalePath(`/e/${slug}/promote/cancel`, locale)}`;

  try {
    const { url } = await createPromotionCheckout(event.id, successUrl, cancelUrl);
    return { success: true, url };
  } catch (error) {
    console.error("createPromotionCheckoutAction: checkout failed", error);
    // requireMutationAuth (inside createPromotionCheckout) throws a tagged
    // 401 when the backend Bearer token is missing/expired — surface that as
    // a distinct, actionable reason instead of the generic message, mirroring
    // createEventAction's own 401 handling for the same underlying cause.
    const status = (error as { status?: number })?.status;
    if (status === 401) {
      return {
        success: false,
        error: "Your session has expired. Please sign in again.",
        reason: "stale-session",
      };
    }
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}
