import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { siteUrl } from "@config/index";
import { withLocalePath } from "@utils/i18n-seo";
import type { AppLocale } from "types/i18n";
import { fetchEventBySlug } from "lib/api/events";
import { getCurrentUser } from "@lib/auth/session";
import {
  getPromotionOptions,
  getPromotionStatus,
  isStripeCheckoutUrl,
} from "@lib/api/promotions";
import PromoteEventClient from "./PromoteEventClient";

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
  const [event, currentUser] = await Promise.all([
    fetchEventBySlug(slug),
    getCurrentUser(),
  ]);

  // Only the owner may promote (admins included: the backend has no admin
  // exemption here). 404 so the page doesn't leak, same as /edita.
  const currentUserId = currentUser?.id;
  const isOwner = Boolean(currentUserId) && currentUserId === event?.owner?.id;
  if (!event || !isOwner) return notFound();

  const [options, status] = await Promise.all([
    getPromotionOptions(event.id),
    getPromotionStatus(event.id),
  ]);
  return (
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
  );
}
