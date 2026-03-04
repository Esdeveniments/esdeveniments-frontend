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
  const articleUrl = `${siteUrl}/noticies/${place}/${slug}`;
  return (
    <div className="flex items-center gap-2" aria-label={label}>
      <CardShareButton slug={slug} url={articleUrl} />
    </div>
  );
}
