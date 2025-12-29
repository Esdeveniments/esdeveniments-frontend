"use client";

import dynamic from "next/dynamic";
import { ShareIcon } from "@heroicons/react/24/outline";
import useCheckMobileScreen from "@components/hooks/useCheckMobileScreen";
import { useHydration } from "@components/hooks/useHydration";
import { memo } from "react";
import type { MobileShareProps } from "types/props";

const NativeShareButton = dynamic(
  () => import("@components/ui/common/nativeShareButton"),
  {
    loading: () => <ShareIcon className="h-6 w-6 text-primary" />,
    ssr: false,
  }
);

function MobileShareIsland({
  title,
  slug,
  eventDate,
  location,
}: MobileShareProps) {
  const isHydrated = useHydration();
  const isMobile = useCheckMobileScreen();
  const canNativeShare =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.share;
  if (!isHydrated || !isMobile || !canNativeShare) return null;
  return (
    <NativeShareButton
      title={title}
      url={`/e/${slug}`}
      date={eventDate}
      location={location}
      subLocation=""
      onShareClick={() => { }}
      hideText
    />
  );
}

export default memo(MobileShareIsland);
