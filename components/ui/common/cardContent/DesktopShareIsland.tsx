"use client";

import dynamic from "next/dynamic";
import { memo } from "react";
import useCheckMobileScreen from "@components/hooks/useCheckMobileScreen";
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
