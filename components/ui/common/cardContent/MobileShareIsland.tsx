"use client";

import dynamic from "next/dynamic";
import { ShareIcon } from "@heroicons/react/outline";
import useCheckMobileScreen from "@components/hooks/useCheckMobileScreen";
import { memo } from "react";

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
}: {
  title: string;
  slug: string;
  eventDate: string;
  location: string;
}) {
  const isMobile = useCheckMobileScreen();
  const canNativeShare =
    typeof window !== "undefined" && typeof navigator !== "undefined" && !!navigator.share;
  if (!isMobile || !canNativeShare) return null;
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
