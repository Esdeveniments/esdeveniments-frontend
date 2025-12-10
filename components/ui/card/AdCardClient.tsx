"use client";

import dynamic from "next/dynamic";
import { memo } from "react";
import { retryDynamicImport } from "@utils/dynamic-import-retry";

const AdCard = dynamic(
  () =>
    retryDynamicImport(() => import("@components/ui/adCard")),
  {
    loading: () => (
      <div className="flex justify-center items-center w-full">
        <div className="w-full h-60 bg-muted animate-fast-pulse"></div>
      </div>
    ),
    ssr: false,
  }
);

function AdCardClient() {
  return <AdCard />;
}

export default memo(AdCardClient);
