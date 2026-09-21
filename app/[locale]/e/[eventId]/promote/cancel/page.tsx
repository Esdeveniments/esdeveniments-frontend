import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import type { AppLocale } from "types/i18n";
import { Link } from "@i18n/routing";

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootLocale()) as AppLocale;
  const t = await getTranslations({ locale, namespace: "App.EventPromote.cancelPage" });
  return {
    title: t("title"),
    description: t("subtitle"),
    robots: { index: false, follow: false },
  };
}

export default async function PromoteCancelPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId: slug } = await params;
  const locale = (await rootLocale()) as AppLocale;
  setRequestLocale(locale);
  const t = await getTranslations("App.EventPromote.cancelPage");

  return (
    // max-w-3xl matches /patrocina/cancelled exactly — same reasoning as the
    // success page above.
    <main className="min-h-screen bg-background py-section-y px-section-x">
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <h1 className="heading-1">{t("title")}</h1>
        <p className="body-large text-foreground/80">{t("subtitle")}</p>

        <div className="flex justify-center">
          <Link href={`/e/${slug}`} className="btn-outline">
            {t("backToEvent")}
          </Link>
        </div>
      </div>
    </main>
  );
}
