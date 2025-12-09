"use client";

import { useTranslations } from "next-intl";
import type { NoEventsFoundProps } from "types/props";
import NoEventsFoundContent from "./NoEventsFoundContent";

export default function NoEventsFoundClient({
  title,
  description,
  prefix = "",
}: NoEventsFoundProps & { prefix?: string }) {
  const t = useTranslations("Components.NoEventsFound");

  return (
    <NoEventsFoundContent
      title={title}
      description={description}
      prefix={prefix}
      ctaLabel={t("cta")}
      helperText={t("helper")}
    />
  );
}

