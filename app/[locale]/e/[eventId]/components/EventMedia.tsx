import React from "react";
import dynamic from "next/dynamic";
import type { EventMediaProps } from "types/event";
import EventImage from "./EventImage";

// VideoDisplay is just an iframe, can be server-rendered
const VideoDisplay = dynamic(
  () => import("components/ui/common/videoDisplay"),
  {
    loading: () => (
      <div className="w-full aspect-[16/9] bg-muted animate-pulse rounded-card"></div>
    ),
  }
);

const EventMedia: React.FC<EventMediaProps> = ({ event, title }) => {
  // Check if we have a video URL - if so, display video
  if (event.videoUrl) {
    return (
      <div className="w-full">
        <div className="w-full aspect-[16/9] overflow-hidden rounded-card">
          <VideoDisplay videoUrl={event.videoUrl} />
        </div>
      </div>
    );
  }

  // Check if we have an image - if so, display image using EventImage component
  if (event.imageUrl) {
    return (
      <div className="w-full">
        <EventImage image={event.imageUrl} title={title} />
      </div>
    );
  }

  // No image: no placeholder box; the page starts with the title.
  return null;
};

export default EventMedia;
