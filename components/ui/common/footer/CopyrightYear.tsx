"use client";

import { useTranslations } from "next-intl";
import type { CopyrightNoticeProps } from "types/props";

export default function CopyrightNotice({ year }: CopyrightNoticeProps) {
  const t = useTranslations("Components.Footer");
  return (
    <span className="body-small text-muted-foreground text-center">
      {t("copyright", { year })}
    </span>
  );
}
