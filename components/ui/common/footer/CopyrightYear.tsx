"use client";

import { useTranslations } from "next-intl";

export default function CopyrightNotice() {
  const t = useTranslations("Components.Footer");
  return (
    <span className="body-small text-muted-foreground text-center">
      {t("copyright", { year: new Date().getFullYear() })}
    </span>
  );
}
