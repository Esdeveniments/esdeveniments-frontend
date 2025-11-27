import { ClockIcon } from "@heroicons/react/outline";
import type { EventTemporalStatus } from "types/event-status";

const contentClassName =
  "flex items-center gap-element-gap-sm body-normal text-foreground-strong/70";

const EventStatusDetails: React.FC<{
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

  const liveContent =
    temporalStatus.state === "live"
      ? temporalStatus.endsIn || timeDisplay
      : null;
  const upcomingContent =
    temporalStatus.state === "upcoming"
      ? temporalStatus.startsIn || timeDisplay
      : null;

  return (
    <div
      className={`flex items-center gap-element-gap-sm py-element-gap-sm ${className}`}
    >
      <ClockIcon className="w-4 h-4 text-foreground-strong/70" />
      {liveContent && <div className={contentClassName}>{liveContent}</div>}

      {upcomingContent && (
        <div className={contentClassName}>{upcomingContent}</div>
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
