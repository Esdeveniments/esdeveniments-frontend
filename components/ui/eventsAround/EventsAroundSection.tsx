import React from "react";
import { ShareIcon } from "@heroicons/react/outline";
import EventsAroundServer from "@components/ui/eventsAround/EventsAroundServer";
import type { EventsAroundProps } from "types/common";

const EventsAroundSection: React.FC<EventsAroundProps> = ({
  events,
  title = "Esdeveniments relacionats",
}) => {
  if (!events || events.length === 0) return null;

  return (
    <div className="w-full">
      {/* Title section - constrained width */}
      <div className="w-full flex justify-center items-start gap-2 px-4 mb-4">
        <ShareIcon className="w-5 h-5 mt-1" />
        <div className="w-11/12 min-w-0">
          <h2>{title}</h2>
        </div>
      </div>
      {/* Horizontal scroll section - full width to allow proper spacing */}
      <div className="w-full overflow-hidden">
        <EventsAroundServer
          events={events}
          layout="compact"
          showJsonLd={false} // JSON-LD handled server-side for SEO
          title={title}
        />
      </div>
    </div>
  );
};

export default EventsAroundSection;
