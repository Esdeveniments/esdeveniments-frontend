import React from "react";
import type { EventHeaderProps } from "types/event";
import type { EventStatusMeta } from "types/event-status";
import EventStatusBadge from "./EventStatusBadge";
import { Text } from "components/ui/primitives/Text";

const EventHeader: React.FC<
  EventHeaderProps & { statusMeta?: EventStatusMeta }
> = ({ title, statusMeta }) => {
  return (
    <div className="flex w-full flex-col items-start justify-start gap-component-xs px-component-md">
      <div className="flex flex-wrap items-center gap-component-sm">
        <Text as="h1" variant="h1" className="uppercase tracking-tight">
          {title}
        </Text>
        <EventStatusBadge status={statusMeta} />
      </div>
    </div>
  );
};

export default EventHeader;
