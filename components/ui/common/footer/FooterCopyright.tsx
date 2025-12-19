"use client";

import { useTranslations } from "next-intl";
import type { JSX } from "react";

export default function FooterCopyright({
  year,
}: {
  year?: number | null;
}): JSX.Element {
  const t = useTranslations("Components.Footer");

  return <>{t("copyright", { year: year ?? "" })}</>;
}
