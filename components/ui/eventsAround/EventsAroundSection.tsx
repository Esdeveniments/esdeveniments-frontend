import React from "react";
import EventsAroundServer from "@components/ui/eventsAround/EventsAroundServer";
import type { EventsAroundProps } from "types/common";
import SectionHeading from "@components/ui/common/SectionHeading";
import { ShareIcon } from "@heroicons/react/outline";

const EventsAroundSection: React.FC<EventsAroundProps> = ({
  events,
  title = "Esdeveniments relacionats",
}) => {
  if (!events || events.length === 0) return null;

  return (
    <div className="w-full min-w-0">
      {/* Title section - constrained width */}
      <div className="w-full mb-element-gap">
        <SectionHeading
          Icon={ShareIcon}
          iconClassName="h-5 w-5 text-foreground-strong flex-shrink-0"
          title={title}
          titleClassName="heading-2"
        />
      </div>
      {/* Horizontal scroll section - full width to allow proper spacing */}
      <div className="w-full overflow-hidden min-w-0">
        <EventsAroundServer
          events={events}
          layout="compact"
          showJsonLd={false} // JSON-LD handled server-side for SEO
          title={title}
          useDetailTimeFormat={true} // Use phrase format for related events in detail pages
        />
      </div>
    </div>
  );
};

export default EventsAroundSection;
