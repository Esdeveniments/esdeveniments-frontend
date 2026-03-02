import React from "react";
import type { EventHeaderProps } from "types/event";
import type { EventTemporalStatus } from "types/event-status";
import EventStatusBadge from "./EventStatusBadge";

// TODO: Uncomment when backend supports event.type ("FREE" | "PAID") in detail endpoint.
// The EventDetailResponseDTO already has `type: EventType` but the backend does not
// populate it reliably yet. Once it does, pass `eventType` prop and display the badge.
// import type { EventType } from "types/api/event";

const EventHeader: React.FC<
  EventHeaderProps & { temporalStatus?: EventTemporalStatus }
> = ({ title, temporalStatus }) => {
  return (
    <div className="w-full flex flex-col justify-start items-start gap-element-gap-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="heading-1">{title}</h1>
        <EventStatusBadge status={temporalStatus} />
        {/* TODO: Show FREE/PAID badge when backend reliably populates event.type
        {eventType && (
          <span
            className={`inline-flex items-center rounded-md px-2 py-1 label font-semibold ${
              eventType === "FREE"
                ? "bg-primary/10 text-primary border border-primary/30"
                : "bg-primary-dark/10 text-primary-dark border border-primary-dark/30"
            }`}
          >
            {eventType === "FREE" ? t("free") : t("paid")}
          </span>
        )}
        */}
      </div>
    </div>
  );
};

export default EventHeader;
