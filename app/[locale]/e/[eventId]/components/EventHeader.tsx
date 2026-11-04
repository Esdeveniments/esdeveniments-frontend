import React from "react";
import type { EventHeaderProps } from "types/event";
import type { EventTemporalStatus } from "types/event-status";
import EventStatusBadge from "./EventStatusBadge";

const EventHeader: React.FC<
  EventHeaderProps & { temporalStatus?: EventTemporalStatus }
> = ({ title, temporalStatus }) => {
  return (
    <div className="w-full flex flex-col justify-start items-start gap-element-gap-sm">
      <h1 className="heading-1">{title}</h1>
      <div className="flex flex-wrap items-center gap-2">
        <EventStatusBadge status={temporalStatus} />
      </div>
    </div>
  );
};

export default EventHeader;
