import EventStatusBadge from "./EventStatusBadge";
import EventStatusDetails from "./EventStatusDetails";
import type { EventTemporalStatus } from "types/event-status";

const EventStatusGroup: React.FC<{
  temporalStatus: EventTemporalStatus;
  formattedStart?: string | null;
  formattedEnd?: string | null;
  nameDay?: string | null;
  timeDisplay?: string;
  className?: string;
}> = ({
  temporalStatus,
  formattedStart,
  formattedEnd,
  nameDay,
  timeDisplay,
  className = "",
}) => {
  if (!temporalStatus) return null;

  return (
    <div className={`flex flex-col items-start gap-1 ${className}`}>
      <EventStatusBadge status={temporalStatus} />
      <EventStatusDetails
        temporalStatus={temporalStatus}
        formattedStart={formattedStart}
        formattedEnd={formattedEnd}
        nameDay={nameDay}
        timeDisplay={timeDisplay}
      />
    </div>
  );
};

export default EventStatusGroup;
