import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { siteUrl } from "@config/index";
import { withLocalePath } from "@utils/i18n-seo";
import type { AppLocale } from "types/i18n";
import { getOwnedEventBySlug, ownerCheckNeedsRefresh } from "@lib/auth/owned-event";
import {
  getPromotionOptions,
  getPromotionStatus,
  isStripeCheckoutUrl,
} from "@lib/api/promotions";
import PromoteEventClient from "./PromoteEventClient";
import RefreshSession from "./RefreshSession";
import SessionRefreshNotice from "./SessionRefreshNotice";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<Metadata> {
  const { eventId } = await params;
  const locale = (await rootLocale()) as AppLocale;
  const t = await getTranslations({ locale, namespace: "App.EventPromote" });
  const canonical = `${siteUrl}${withLocalePath(`/e/${eventId}/promote`, locale)}`;
  return {
    title: t("title"),
    description: t("description"),
    robots: "noindex, nofollow",
    alternates: { canonical },
  };
}

export default async function PromotePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const slug = (await params).eventId;
  // Owner only; the backend has no admin exemption for promotions.
  const event = await getOwnedEventBySlug(slug);
  if (!event) {
    return (await ownerCheckNeedsRefresh()) ? <SessionRefreshNotice /> : notFound();
  }

  const [options, status] = await Promise.all([
    getPromotionOptions(event.id),
    getPromotionStatus(event.id),
  ]);
  return (
    <>
      {!options.ok && options.code === "AUTHENTICATION_REQUIRED" && (
        <RefreshSession />
      )}
      <PromoteEventClient
        eventId={event.id}
        slug={event.slug}
        options={options}
        pendingCheckoutUrl={
          status.ok && isStripeCheckoutUrl(status.data.checkoutUrl)
            ? status.data.checkoutUrl
            : null
        }
      />
    </>
  );
}
