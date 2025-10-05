"use client";
import { useEffect, useState } from "react";
import { ShareButton, Skeleton } from "components/ui/primitives";
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
}: EventShareBarClientProps) {
  // Track client mount so we can render a neutral skeleton on the server and
  // only show the final interactive UI after hydration. This prevents the
  // server from rendering a desktop UI that then immediately switches to
  // mobile on the client.
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  return (
    // Use a fixed height to avoid layout shifts when we swap the inner content.
    <div className="flex h-8 w-full items-center">
      {!hasMounted ? (
        <Skeleton variant="share" />
      ) : (
        <ShareButton
          slug={slug}
          strategy="auto"
          title={title}
          description={description}
          date={eventDateString}
          location={location}
          subLocation={`${cityName}, ${regionName}, ${postalCode}`}
        />
      )}
    </div>
  );
}
