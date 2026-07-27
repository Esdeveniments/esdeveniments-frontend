import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import type { Metadata } from "next";
import type { AppLocale } from "types/i18n";
import EditProfileContent from "./EditProfileContent";

// Private, per-user utility page — never indexed, mirrors /e/[eventId]/edita.
export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootLocale()) as AppLocale;
  const t = await getTranslations({ locale, namespace: "App.EditProfile" });
  return {
    title: t("title"),
    description: t("description"),
    robots: "noindex, nofollow",
  };
}

export default function EditProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="container flex-center pt-[6rem] pb-section-y">
          <div className="w-full max-w-md h-80 rounded-lg bg-border/40 animate-pulse" />
        </div>
      }
    >
      <EditProfileContent />
    </Suspense>
  );
}
