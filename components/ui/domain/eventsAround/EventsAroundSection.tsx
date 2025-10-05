import React from "react";
import { ShareIcon } from "@heroicons/react/outline";
import { Text } from "@components/ui/primitives";
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
      <div className="mb-component-md flex w-full items-start justify-center gap-component-xs px-component-md">
        <ShareIcon className="mt-component-xs h-5 w-5" />
        <div className="w-11/12 min-w-0">
          <Text as="h2" variant="h2">
            {title}
          </Text>
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
