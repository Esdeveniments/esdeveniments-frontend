import React from "react";
import dynamic from "next/dynamic";
import type { EventMediaProps } from "types/event";

const VideoDisplay = dynamic(() => import("components/ui/common/videoDisplay"));
const ImageDefault = dynamic(() => import("components/ui/imgDefault"));

const EventMedia: React.FC<EventMediaProps> = ({ event, title }) => {
  return (
    <div className="w-full flex flex-col justify-center items-start gap-4">
      {event.url ? (
        <VideoDisplay videoUrl={event.url} />
      ) : (
        <ImageDefault
          date={event.startDate}
          location={event.location}
          subLocation={title}
        />
      )}
    </div>
  );
};

export default EventMedia;
