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
    <>
      {temporalStatus.state === "live" && temporalStatus.endsIn && (
        <span className={`text-blackCorp/70 text-sm ${className}`}>
          {temporalStatus.endsIn}
        </span>
      )}

      {temporalStatus.state === "upcoming" && temporalStatus.startsIn && (
        <span className={`text-blackCorp/70 text-sm ${className}`}>
          {temporalStatus.startsIn}
        </span>
      )}

      {temporalStatus.state === "past" && (
        <span className={`text-blackCorp/70 text-sm ${className}`}>
          Va finalitzar el{" "}
          {formattedEnd
            ? `Del ${formattedStart} al ${formattedEnd}`
            : `${nameDay}, ${formattedStart}`}
        </span>
      )}
    </>
  );
};

export default EventStatusDetails;
