"use client";
import CardShareButton from "components/ui/common/cardShareButton";
import NativeShareButton from "components/ui/common/nativeShareButton";
import ViewCounter from "components/ui/viewCounter";
import useCheckMobileScreen from "components/hooks/useCheckMobileScreen";
import type { EventShareBarProps } from "types/event";

export default function EventShareBar({
  slug,
  title,
  eventDateString,
  location,
  cityName,
  regionName,
}: EventShareBarProps) {
  const isMobile = useCheckMobileScreen();
  const canNativeShare = typeof window !== "undefined" && !!navigator.share;
  const showNativeShare = isMobile && canNativeShare;

  return (
    <div className="w-full flex justify-between items-center px-4 h-2">
      {showNativeShare ? (
        <NativeShareButton
          title={title}
          url={slug}
          date={eventDateString}
          location={location}
          subLocation={`${cityName}, ${regionName}`}
        />
      ) : (
        <CardShareButton slug={slug} />
      )}
      <ViewCounter slug={slug} />
    </div>
  );
}
