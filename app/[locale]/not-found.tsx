"use client";
import PressableLink from "@components/ui/primitives/PressableLink";
import { useTranslations } from "next-intl";

export default function NotFound() {
  const t = useTranslations("App.NotFound");

  return (
    <div
      className="flex-1 flex-center flex-col py-section-y px-section-x text-center"
      data-testid="not-found-page"
    >
      <h1 className="heading-2" data-testid="not-found-title">
        {t("title")}
      </h1>
      <p>{t("description")}</p>
      <PressableLink
        href="/"
        className="text-primary underline"
        data-testid="not-found-home-link"
        variant="inline"
      >
        {t("homeLink")}
      </PressableLink>
    </div>
  );
}
