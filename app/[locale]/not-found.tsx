"use client";
import PressableLink from "@components/ui/primitives/PressableLink";
import { useTranslations } from "next-intl";

export default function NotFound() {
  const t = useTranslations("App.NotFound");

  return (
    <div
      style={{ padding: 32, textAlign: "center" }}
      data-testid="not-found-page"
    >
      <h1 className="heading-2" data-testid="not-found-title">
        {t("title")}
      </h1>
      <p>{t("description")}</p>
      <PressableLink
        href="/"
        style={{ color: "#0070f3", textDecoration: "underline" }}
        data-testid="not-found-home-link"
        variant="inline"
      >
        {t("homeLink")}
      </PressableLink>
    </div>
  );
}
