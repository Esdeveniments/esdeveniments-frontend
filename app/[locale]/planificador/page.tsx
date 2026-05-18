import type { Metadata } from "next";

import { buildPageMeta } from "@components/partials/seo-meta";
import { siteUrl } from "@config/index";
import { locale as rootLocale } from "next/root-params";
import { getTranslations } from "next-intl/server";
import type { AppLocale } from "types/i18n";
import PlannerForm from "./PlannerForm";

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootLocale()) as AppLocale;
  const t = await getTranslations({ locale, namespace: "App.Planner" });

  return {
    ...(buildPageMeta({
      title: t("title"),
      description: t("description"),
      canonical: `${siteUrl}/planificador`,
      locale,
    }) as Metadata),
    robots: "noindex, nofollow",
  };
}

export default async function PlannerPage() {
  const locale = (await rootLocale()) as AppLocale;
  const t = await getTranslations({ locale, namespace: "App.Planner" });

  const suggestions: string[] = t.raw("suggestions") as string[];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="mb-8">
        <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary">
          {t("badge")}
        </span>
        <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
          {t("heading")}
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          {t("subheading")}
        </p>
      </header>

      <PlannerForm
        locale={locale}
        placeholder={t("placeholder")}
        submitLabel={t("submit")}
        loadingLabel={t("loading")}
        emptyLabel={t("empty")}
        errorLabel={t("error")}
        suggestionsLabel={t("suggestionsLabel")}
        suggestions={suggestions}
        resultsLabel={t("resultsLabel")}
        eventsLabel={t("eventsLabel")}
        noMatchesLabel={t("noMatches")}
        modelDisclaimer={t("modelDisclaimer")}
      />
    </main>
  );
}
