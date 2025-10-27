"use client";

import dynamic from "next/dynamic";
import { memo } from "react";

const AdCard = dynamic(() => import("@components/ui/adCard"), {
  loading: () => (
    <div className="flex justify-center items-center w-full">
      <div className="w-full h-60 bg-foreground-strong animate-fast-pulse"></div>
    </div>
  ),
  ssr: false,
});

function AdCardClient() {
  return <AdCard />;
}

export default memo(AdCardClient);
