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
    <div className={`flex items-center gap-2 py-2 ${className}`}>
      <ClockIcon className="w-4 h-4 text-foreground-strong/70" />
      {temporalStatus.state === "live" && temporalStatus.endsIn && (
        <div
          className={`flex items-center gap-2 body-normal text-foreground-strong/70 ${className}`}
        >
          {temporalStatus.endsIn}
        </div>
      )}

      {temporalStatus.state === "upcoming" && temporalStatus.startsIn && (
        <div
          className={`flex items-center gap-2 body-normal text-foreground-strong/70 ${className}`}
        >
          {temporalStatus.startsIn}
        </div>
      )}

      {temporalStatus.state === "past" && (
        <div
          className={`flex items-center gap-2 body-normal text-foreground-strong/70 ${className}`}
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
