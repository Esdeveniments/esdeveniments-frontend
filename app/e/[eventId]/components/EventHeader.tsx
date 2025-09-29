import React from "react";
import type { EventHeaderProps } from "types/event";
import type { EventStatusMeta } from "types/event-status";
import EventStatusBadge from "./EventStatusBadge";

const EventHeader: React.FC<
  EventHeaderProps & { statusMeta?: EventStatusMeta }
> = ({ title, statusMeta }) => {
  return (
    <div className="w-full flex flex-col justify-start items-start gap-2 px-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold uppercase tracking-tight">{title}</h1>
        <EventStatusBadge status={statusMeta} />
      </div>
    </div>
  );
};

export default EventHeader;
