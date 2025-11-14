"use client";

import dynamic from "next/dynamic";
import { memo } from "react";
import useCheckMobileScreen from "@components/hooks/useCheckMobileScreen";
import { useHydration } from "@components/hooks/useHydration";
import type { CardShareButtonProps } from "types/common";

import ShareIslandSkeleton from "@components/ui/common/shareIslandSkeleton";

const ShareButton = dynamic(
  () => import("@components/ui/common/cardShareButton"),
  {
    ssr: false,
    loading: () => <ShareIslandSkeleton />,
  }
);

function DesktopShareIsland({ slug }: CardShareButtonProps) {
  const isHydrated = useHydration();
  const isMobile = useCheckMobileScreen();
  const canNativeShare =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.share;
  const showNativeOnMobile = isMobile && canNativeShare;

  // Don't render until after hydration to prevent hydration mismatch
  // This ensures server and client render the same initial HTML
  if (!isHydrated) {
    return (
      <div className="w-[172px] h-8 flex items-center">
        <ShareIslandSkeleton />
      </div>
    );
  }

  return (
    <div className="w-[172px] h-8 flex items-center">
      {!showNativeOnMobile && <ShareButton slug={slug} />}
    </div>
  );
}

export default memo(DesktopShareIsland);
