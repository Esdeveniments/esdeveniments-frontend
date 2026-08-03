import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import type { AppLocale } from "types/i18n";
import { Link } from "@i18n/routing";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootLocale()) as AppLocale;
  const t = await getTranslations({ locale, namespace: "App.EventPromote.successPage" });
  return {
    title: t("title"),
    description: t("subtitle"),
    robots: { index: false, follow: false },
  };
}

export default async function PromoteSuccessPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId: slug } = await params;
  const locale = (await rootLocale()) as AppLocale;
  setRequestLocale(locale);
  const t = await getTranslations("App.EventPromote.successPage");

  return (
    // max-w-3xl matches the existing /patrocina/success precedent exactly
    // (app/[locale]/patrocina/success/page.tsx) — same return-page pattern,
    // reused verbatim rather than picking a new width for no reason.
    <main className="min-h-screen bg-background py-section-y px-section-x">
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <div className="flex justify-center">
          <CheckCircleIcon className="h-16 w-16 text-success" />
        </div>
        <h1 className="heading-1">{t("title")}</h1>
        <p className="body-large text-foreground/80">{t("subtitle")}</p>

        <div className="flex justify-center">
          <Link href={`/e/${slug}`} className="btn-primary">
            {t("backToEvent")}
          </Link>
        </div>
      </div>
    </main>
  );
}
