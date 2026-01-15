import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@i18n/routing";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Sponsorship");
  return {
    title: t("successPage.meta.title"),
    description: t("successPage.meta.description"),
    robots: { index: false, follow: false },
  };
}

export default async function PatrocinaSuccessPage() {
  const t = await getTranslations("Sponsorship");

  return (
    <main className="min-h-screen bg-background py-section-y px-section-x">
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <div className="flex justify-center">
          <CheckCircleIcon className="h-16 w-16 text-green-500" />
        </div>
        <h1 className="heading-1">{t("successPage.title")}</h1>
        <p className="body-large text-foreground/80">{t("successPage.subtitle")}</p>

        <div className="card-bordered card-body text-left space-y-3">
          <h2 className="heading-3">{t("successPage.nextTitle")}</h2>
          <ul className="body-normal text-foreground/70 list-disc pl-6 space-y-1">
            <li>{t("successPage.next1")}</li>
            <li>{t("successPage.next2")}</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="btn-primary">
            {t("successPage.backHome")}
          </Link>
          <Link href="/patrocina" className="btn-outline">
            {t("successPage.backPatrocina")}
          </Link>
        </div>
      </div>
    </main>
  );
}

