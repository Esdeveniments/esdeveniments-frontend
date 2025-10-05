import { ClockIcon } from "@heroicons/react/outline";
import type { EventTemporalStatus } from "types/event-status";

const EventStatusDetails: React.FC<{
  temporalStatus: EventTemporalStatus;
  formattedStart?: string | null;
  formattedEnd?: string | null;
  nameDay?: string | null;
  className?: string;
}> = ({
  temporalStatus,
  formattedStart,
  formattedEnd,
  nameDay,
  className = "",
}) => {
  if (!temporalStatus) return null;

  return (
    <div className={`flex items-center gap-component-xs py-component-xs ${className}`}>
      <ClockIcon className="h-4 w-4 text-blackCorp/70" />
      {temporalStatus.state === "live" && temporalStatus.endsIn && (
        <div
          className={`text-md flex items-center gap-component-xs text-blackCorp/70 ${className}`}
        >
          {temporalStatus.endsIn}
        </div>
      )}

      {temporalStatus.state === "upcoming" && temporalStatus.startsIn && (
        <div
          className={`text-md flex items-center gap-component-xs text-blackCorp/70 ${className}`}
        >
          {temporalStatus.startsIn}
        </div>
      )}

      {temporalStatus.state === "past" && (
        <div
          className={`text-md flex items-center gap-component-xs text-blackCorp/70 ${className}`}
        >
          Va finalitzar el{" "}
          {formattedEnd
            ? `Del ${formattedStart} al ${formattedEnd}`
            : `${nameDay}, ${formattedStart}`}
        </div>
      )}
    </div>
  );
};

export default EventStatusDetails;
