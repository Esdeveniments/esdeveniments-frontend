"use client";

import dynamic from "next/dynamic";
import type { AdArticleProps } from "types/common";
import { retryDynamicImport } from "@utils/dynamic-import-retry";

const AdArticleDynamic = dynamic(
  () =>
    retryDynamicImport(() => import("components/ui/adArticle")),
  {
    ssr: false,
    loading: () => null,
  }
);

export default function AdArticleIsland(props: AdArticleProps) {
  return <AdArticleDynamic {...props} />;
}


