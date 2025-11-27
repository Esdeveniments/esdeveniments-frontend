"use client";
import { useEffect, useState } from "react";
import CardShareButton from "components/ui/common/cardShareButton";
import NativeShareButton from "components/ui/common/nativeShareButton";
import useCheckMobileScreen from "components/hooks/useCheckMobileScreen";
import ShareIslandSkeleton from "@components/ui/common/shareIslandSkeleton";
import type { EventShareBarClientProps } from "types/event";

export default function EventShareBar({
  slug,
  title,
  description,
  eventDateString,
  location,
  cityName,
  regionName,
  postalCode,
  initialIsMobile,
}: EventShareBarClientProps) {
  const isMobile = useCheckMobileScreen(initialIsMobile);
  const canNativeShare = typeof window !== "undefined" && !!navigator.share;
  const showNativeShare = isMobile && canNativeShare;

  // Track client mount so we can render a neutral skeleton on the server and
  // only show the final interactive UI after hydration. This prevents the
  // server from rendering a desktop UI that then immediately switches to
  // mobile on the client.
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setHasMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    // Use a fixed height to avoid layout shifts when we swap the inner content.
    <div className="w-full flex items-center h-8">
      {!hasMounted ? (
        <ShareIslandSkeleton />
      ) : showNativeShare ? (
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
    </div>
  );
}
