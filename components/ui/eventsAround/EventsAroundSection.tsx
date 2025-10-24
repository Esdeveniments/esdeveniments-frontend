import React from "react";
import { ShareIcon } from "@heroicons/react/outline";
import EventsAroundServer from "@components/ui/eventsAround/EventsAroundServer";
import type { EventsAroundProps } from "types/common";

const EventsAroundSection: React.FC<EventsAroundProps> = ({
  events,
  title = "Esdeveniments relacionats",
  nonce = "",
}) => {
  if (!events || events.length === 0) return null;

  return (
    <div className="w-full">
      {/* Title section - constrained width */}
      <div className="w-full flex justify-center items-start gap-2 px-4 mb-4">
        <ShareIcon
          className="h-5 w-5 mt-1 text-blackCorp flex-shrink-0"
          aria-hidden="true"
        />
        <div className="w-11/12 flex flex-col gap-4">
          <h2 className="heading-3">{title}</h2>
        </div>
      </div>
      {/* Horizontal scroll section - full width to allow proper spacing */}
      <div className="w-full overflow-hidden">
        <EventsAroundServer
          events={events}
          layout="compact"
          showJsonLd={false} // JSON-LD handled server-side for SEO
          title={title}
          nonce={nonce}
        />
      </div>
    </div>
  );
};

export default EventsAroundSection;
