"use client";

import dynamic from "next/dynamic";
import { siteUrl } from "@config/index";
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
  // Canonical URL without locale prefix to consolidate social signals
  const articleUrl = `${siteUrl}/noticies/${place}/${slug}`;
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <CardShareButton slug={slug} url={articleUrl} />
    </div>
  );
}
