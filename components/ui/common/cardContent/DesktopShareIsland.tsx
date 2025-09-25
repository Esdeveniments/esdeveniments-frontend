"use client";

import dynamic from "next/dynamic";
import { memo } from "react";
import useCheckMobileScreen from "@components/hooks/useCheckMobileScreen";
import type { CardShareButtonProps } from "types/common";

const ShareButton = dynamic(
  () => import("@components/ui/common/cardShareButton"),
  {
    ssr: false,
    loading: () => (
      <div className="w-[172px] h-8 flex items-center gap-4" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"
          />
        ))}
      </div>
    ),
  }
);

function DesktopShareIsland({ slug }: CardShareButtonProps) {
  const isMobile = useCheckMobileScreen();
  const canNativeShare =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.share;
  const showNativeOnMobile = isMobile && canNativeShare;

  return (
    <div className="w-[172px] h-8 flex items-center">
      {!showNativeOnMobile && <ShareButton slug={slug} />}
    </div>
  );
}

export default memo(DesktopShareIsland);
