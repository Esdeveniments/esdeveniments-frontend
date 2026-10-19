import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import type { AppLocale } from "types/i18n";
import { fetchEventBySlug } from "lib/api/events";
import { getCurrentUser } from "@lib/auth/session";
import { getPromotionStatus } from "@lib/api/promotions";
import PromotionStatusPanel from "../PromotionStatusPanel";

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootLocale()) as AppLocale;
  const t = await getTranslations({ locale, namespace: "App.EventPromote.cancelPage" });
  return {
    title: t("title"),
    robots: { index: false, follow: false },
  };
}

// Stripe returns here as /e/{slug}/promote/cancel (no locale prefix, no session id).
export default async function PromoteCancelPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const slug = (await params).eventId;
  const locale = (await rootLocale()) as AppLocale;
  setRequestLocale(locale);

  const [event, currentUser] = await Promise.all([
    fetchEventBySlug(slug),
    getCurrentUser(),
  ]);
  const isOwner = Boolean(currentUser?.id) && currentUser?.id === event?.owner?.id;
  if (!event || !isOwner) return notFound();

  const status = await getPromotionStatus(event.id);
  return (
    <PromotionStatusPanel
      slug={event.slug}
      status={status.ok ? status.data : null}
      variant="cancel"
    />
  );
}
