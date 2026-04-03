import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLocaleSafely } from "@utils/i18n-seo";
import SponsorUploadPageClient from "@components/ui/sponsor/SponsorUploadPageClient";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocaleSafely();
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

export default async function PatrocinaUploadPage() {
  const locale = await getLocaleSafely();
  setRequestLocale(locale);

  return (
    <main className="min-h-screen bg-background py-section-y px-section-x">
      <div className="max-w-5xl mx-auto">
        <Suspense fallback={<UploadPageSkeleton />}>
          <SponsorUploadPageClient />
        </Suspense>
      </div>
    </main>
  );
}

