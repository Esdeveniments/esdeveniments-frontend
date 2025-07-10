import React from "react";
import dynamic from "next/dynamic";
import type { EventMediaProps } from "types/event";
import EventImage from "./EventImage";

// VideoDisplay is just an iframe, can be server-rendered
const VideoDisplay = dynamic(
  () => import("components/ui/common/videoDisplay"),
  {
    loading: () => (
      <div className="w-full h-60 bg-darkCorp animate-pulse"></div>
    ),
  }
);

// ImageDefault for fallback cases
const ImageDefault = dynamic(() => import("components/ui/imgDefault"), {
  loading: () => <div className="w-full h-60 bg-darkCorp animate-pulse"></div>,
});

const EventMedia: React.FC<EventMediaProps> = ({ event, title }) => {
  // Check if we have a video URL - if so, display video
  if (event.videoUrl) {
    return (
      <div className="w-full flex flex-col justify-center items-start gap-4 overflow-hidden">
        <VideoDisplay videoUrl={event.videoUrl} />
      </div>
    );
  }

  // Check if we have an image - if so, display image using EventImage component
  if (event.imageUrl) {
    return (
      <div className="w-full flex flex-col justify-center items-start gap-4 overflow-hidden">
        <EventImage image={event.imageUrl} title={title} />
      </div>
    );
  }

  // Fallback to default image
  return (
    <div className="w-full flex flex-col justify-center items-start gap-4 overflow-hidden">
      <ImageDefault title={title} />
    </div>
  );
};

export default EventMedia;
