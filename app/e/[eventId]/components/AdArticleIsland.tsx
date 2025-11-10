"use client";

import dynamic from "next/dynamic";
import type { AdArticleProps } from "types/common";

const AdArticleDynamic = dynamic(() => import("components/ui/adArticle"), {
  ssr: false,
  loading: () => null,
});

export default function AdArticleIsland(props: AdArticleProps) {
  return <AdArticleDynamic {...props} />;
}


