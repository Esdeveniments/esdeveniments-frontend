"use client";

import dynamic from "next/dynamic";
import { siteUrl } from "@config/index";
import { useLocale } from "next-intl";
import { withLocalePath } from "@utils/i18n-seo";
import type { AppLocale } from "types/i18n";
import type { NewsShareButtonsProps } from "types/props";

const CardShareButton = dynamic(
  () => import("@components/ui/common/cardShareButton"),
  { ssr: false },
);

export default function NewsShareButtons({
  place,
  slug,
  label,
}: NewsShareButtonsProps) {
  const locale = useLocale() as AppLocale;
  const articleUrl = `${siteUrl}${withLocalePath(`/noticies/${place}/${slug}`, locale)}`;
  return (
    <div className="flex items-center gap-2" aria-label={label}>
      <CardShareButton slug={slug} url={articleUrl} />
    </div>
  );
}
