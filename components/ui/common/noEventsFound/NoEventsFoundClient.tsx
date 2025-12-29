"use client";

import { useTranslations } from "next-intl";
import type { NoEventsFoundProps } from "types/props";
import NoEventsFoundContent from "./NoEventsFoundContent";

export default function NoEventsFoundClient({
  title,
  description,
}: NoEventsFoundProps) {
  const t = useTranslations("Components.NoEventsFound");

  return (
    <NoEventsFoundContent
      title={title}
      description={description}
      ctaLabel={t("cta")}
      helperText={t("helper")}
    />
  );
}

