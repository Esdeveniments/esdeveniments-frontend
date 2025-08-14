"use client";

import CardShareButton from "components/ui/common/cardShareButton";
import NativeShareButton from "components/ui/common/nativeShareButton";
import ViewCounter from "components/ui/viewCounter";
import useCheckMobileScreen from "components/hooks/useCheckMobileScreen";
import type { EventShareBarProps } from "types/event";
import FavoriteButton from "./FavoriteButton";

export default function EventShareBar({
  visits,
  slug,
  title,
  description,
  eventDateString,
  location,
  cityName,
  regionName,
  postalCode,
}: EventShareBarProps) {
  const isMobile = useCheckMobileScreen();
  const canNativeShare = typeof window !== "undefined" && !!navigator.share;
  const showNativeShare = isMobile && canNativeShare;

  return (
    <div className="w-full flex justify-between items-center px-4 h-2">
      {showNativeShare ? (
        <NativeShareButton
          title={title}
          text={description}
          url={slug}
          date={eventDateString}
          location={location}
          subLocation={`${cityName}, ${regionName}, ${postalCode}`}
        />
      ) : (
        <CardShareButton slug={slug} />
      )}
      <div className="flex items-center gap-3">
        <FavoriteButton slug={slug} />
        <ViewCounter visits={visits} />
      </div>
    </div>
  );
}
