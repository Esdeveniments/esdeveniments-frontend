import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { siteUrl } from "@config/index";
import { withLocalePath } from "@utils/i18n-seo";
import type { AppLocale } from "types/i18n";
import { fetchEventBySlug } from "lib/api/events";
import { getCurrentUser } from "@lib/auth/session";
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

  // Only the event creator may promote it. Treat missing/unknown ownership as
  // 404 to avoid leaking the existence of the promote page — same convention
  // as the edita page's ownership gate.
  const currentUserId = currentUser?.id;
  const isCreator = Boolean(currentUserId) && currentUserId === event?.owner?.id;
  if (!event || !isCreator) return notFound();

  return <PromoteEventClient eventId={event.id} slug={event.slug} />;
}
