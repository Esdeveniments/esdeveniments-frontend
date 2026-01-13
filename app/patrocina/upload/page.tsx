import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import SponsorUploadPageClient from "@components/ui/sponsor/SponsorUploadPageClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Patrocina");
  return {
    title: t("uploadPage.meta.title"),
    description: t("uploadPage.meta.description"),
    robots: { index: false, follow: false },
  };
}

export default async function PatrocinaUploadPage() {
  return (
    <main className="min-h-screen bg-background py-section-y px-section-x">
      <div className="max-w-5xl mx-auto">
        <SponsorUploadPageClient />
      </div>
    </main>
  );
}

