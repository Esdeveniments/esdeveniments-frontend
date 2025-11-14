"use client";

import dynamic from "next/dynamic";
import { ShareIcon } from "@heroicons/react/outline";
import useCheckMobileScreen from "@components/hooks/useCheckMobileScreen";
import { memo } from "react";
import { useHydration } from "@components/hooks/useHydration";
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
  
  // Don't render until after hydration to prevent hydration mismatch
  // This ensures server and client render the same initial HTML
  if (!isHydrated || !isMobile || !canNativeShare) return null;
  
  return (
    <NativeShareButton
      title={title}
      url={`/e/${slug}`}
      date={eventDate}
      location={location}
      subLocation=""
      onShareClick={() => {}}
      hideText
    />
  );
}

export default memo(MobileShareIsland);
