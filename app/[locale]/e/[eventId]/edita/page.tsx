import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { siteUrl } from "@config/index";
import { withLocalePath } from "@utils/i18n-seo";
import type { AppLocale } from "types/i18n";
import { fetchEventBySlug } from "lib/api/events";
import { fetchRegionsWithCities } from "lib/api/regions";
import { getCurrentUser } from "@lib/auth/session";
import EditEventClient from "./EditEventClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<Metadata> {
  const { eventId } = await params;
  const locale = (await rootLocale()) as AppLocale;
  const t = await getTranslations({ locale, namespace: "App.EventEdit" });
  const canonical = `${siteUrl}${withLocalePath(`/e/${eventId}/edita`, locale)}`;
  return {
    title: t("title"),
    description: t("description"),
    robots: "noindex, nofollow",
    alternates: { canonical },
  };
}

export default async function EditaPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const slug = (await params).eventId;
  const [event, currentUser] = await Promise.all([
    fetchEventBySlug(slug),
    getCurrentUser(),
  ]);

  // Only the event creator may edit. Treat missing/unknown ownership as 404
  // to avoid leaking the existence of the edit page.
  const currentUserId = currentUser?.id;
  const isCreator =
    Boolean(currentUserId) &&
    currentUserId === event?.createdByUser?.id;
  if (!event || !isCreator) return notFound();

  // Fetch region data only after confirming the user is the creator.
  const regionsWithCities = await fetchRegionsWithCities();
  if (!regionsWithCities) return notFound();

  return <EditEventClient event={event} regions={regionsWithCities} />;
}
