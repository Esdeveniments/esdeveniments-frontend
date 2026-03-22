"use client";

import dynamic from "next/dynamic";
import type { AdArticleProps } from "types/common";

// Lazy load AdArticleIsland to reduce initial bundle size
// This is a client component wrapper that allows ssr: false in Next.js 16
const AdArticleIsland = dynamic(() => import("./AdArticleIsland"), {
  ssr: false, // Ads should not be SSR'd
  loading: () => (
    <div className="w-full h-[250px] bg-muted animate-pulse rounded" aria-label="Loading advertisement" />
  ),
});

export default function LazyAdArticleIsland(props: AdArticleProps) {
  return <AdArticleIsland {...props} />;
}


