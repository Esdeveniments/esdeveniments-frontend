import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import type { Metadata } from "next";
import type { AppLocale } from "types/i18n";
import AuthCheckSkeleton from "@components/ui/common/skeletons/AuthCheckSkeleton";
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
    <Suspense fallback={<AuthCheckSkeleton />}>
      <EditProfileContent />
    </Suspense>
  );
}
