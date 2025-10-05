import React from "react";
import dynamic from "next/dynamic";
import type { EventMediaProps } from "types/event";
import { Skeleton } from "@components/ui/primitives";
import EventImage from "./EventImage";

// VideoDisplay is just an iframe, can be server-rendered
const VideoDisplay = dynamic(
  () => import("components/ui/primitives/videoDisplay"),
  {
    loading: () => <Skeleton variant="image" height="h-60" />,
  },
);

// ImageDefault for fallback cases
const ImageDefault = dynamic(
  () => import("components/ui/primitives/ImgDefault"),
  {
    loading: () => <Skeleton variant="image" height="h-60" />,
  },
);

const EventMedia: React.FC<EventMediaProps> = ({ event, title }) => {
  // Check if we have a video URL - if so, display video
  if (event.videoUrl) {
    return (
      <div className="flex w-full flex-col items-start justify-center gap-component-md overflow-hidden">
        <VideoDisplay videoUrl={event.videoUrl} />
      </div>
    );
  }

  // Check if we have an image - if so, display image using EventImage component
  if (event.imageUrl) {
    return (
      <div className="flex w-full flex-col items-start justify-center gap-component-md overflow-hidden">
        <EventImage image={event.imageUrl} title={title} />
      </div>
    );
  }

  // Fallback to default image
  return (
    <div className="flex w-full flex-col items-start justify-center gap-component-md overflow-hidden">
      <ImageDefault title={title} />
    </div>
  );
};

export default EventMedia;
