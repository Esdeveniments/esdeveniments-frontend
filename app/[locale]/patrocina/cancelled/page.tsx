import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLocaleSafely } from "@utils/i18n-seo";
import { Link } from "@i18n/routing";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocaleSafely();
  setRequestLocale(locale);
  const t = await getTranslations("Sponsorship");
  return {
    title: t("cancelPage.meta.title"),
    description: t("cancelPage.meta.description"),
    robots: { index: false, follow: false },
  };
}

export default async function PatrocinaCancelledPage() {
  const locale = await getLocaleSafely();
  setRequestLocale(locale);
  const t = await getTranslations("Sponsorship");

  return (
    <main className="min-h-screen bg-background py-section-y px-section-x">
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <h1 className="heading-1">{t("cancelPage.title")}</h1>
        <p className="body-large text-foreground/80">{t("cancelPage.subtitle")}</p>

        <div className="card-bordered card-body text-left space-y-2">
          <p className="body-normal text-foreground/70">{t("cancelPage.note1")}</p>
          <p className="body-normal text-foreground/70">{t("cancelPage.note2")}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/patrocina#pricing" className="btn-primary">
            {t("cancelPage.tryAgain")}
          </Link>
          <Link href="/" className="btn-outline">
            {t("cancelPage.backHome")}
          </Link>
        </div>
      </div>
    </main>
  );
}

