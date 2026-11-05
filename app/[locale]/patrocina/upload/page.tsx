import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import type { AppLocale } from "types/i18n";
import SponsorUploadPageClient from "@components/ui/sponsor/SponsorUploadPageClient";
import { getSponsorAmountPaid } from "@lib/stripe/session";

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootLocale()) as AppLocale;
  setRequestLocale(locale);
  const t = await getTranslations("Sponsorship");
  return {
    title: t("uploadPage.meta.title"),
    description: t("uploadPage.meta.description"),
    robots: { index: false, follow: false },
  };
}

function UploadPageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 bg-muted rounded w-2/3 mx-auto" />
      <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
      <div className="card-bordered card-body space-y-4">
        <div className="h-32 bg-muted rounded" />
        <div className="h-10 bg-muted rounded w-1/3" />
      </div>
    </div>
  );
}

// Reads what Stripe charged (after promotion codes) for GA4 purchase revenue.
async function SponsorUploadContent({
  searchParams,
}: Pick<PageProps<"/[locale]/patrocina/upload">, "searchParams">) {
  const { session_id: sessionId } = await searchParams;
  const amountPaid =
    typeof sessionId === "string" ? await getSponsorAmountPaid(sessionId) : null;
  return <SponsorUploadPageClient amountPaid={amountPaid} />;
}

export default async function PatrocinaUploadPage({
  searchParams,
}: PageProps<"/[locale]/patrocina/upload">) {
  const locale = (await rootLocale()) as AppLocale;
  setRequestLocale(locale);

  return (
    <main className="min-h-screen bg-background py-section-y px-section-x">
      <div className="max-w-5xl mx-auto">
        <Suspense fallback={<UploadPageSkeleton />}>
          <SponsorUploadContent searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

