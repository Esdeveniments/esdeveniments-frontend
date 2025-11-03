import { ClockIcon } from "@heroicons/react/outline";
import type { EventTemporalStatus } from "types/event-status";

const contentClassName =
  "flex items-center gap-element-gap-sm body-normal text-foreground-strong/70";

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
    <div
      className={`flex items-center gap-element-gap-sm py-element-gap-sm ${className}`}
    >
      <ClockIcon className="w-4 h-4 text-foreground-strong/70" />
      {temporalStatus.state === "live" && temporalStatus.endsIn && (
        <div className={contentClassName}>{temporalStatus.endsIn}</div>
      )}

      {temporalStatus.state === "upcoming" && temporalStatus.startsIn && (
        <div className={contentClassName}>{temporalStatus.startsIn}</div>
      )}

      {temporalStatus.state === "past" && (
        <div className={contentClassName}>
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
