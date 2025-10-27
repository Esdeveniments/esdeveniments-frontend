import type { EventStatusMeta, EventTemporalStatus } from "types/event-status";

const stateStyles: Record<EventStatusMeta["state"], string> = {
  past: "bg-[#6b7280] text-background",
  live: "bg-[#16a34a] text-background animate-pulse",
  upcoming: "bg-[#2563eb] text-background",
};

const EventStatusBadge: React.FC<{
  status?: EventStatusMeta | EventTemporalStatus | null;
  ariaLabelPrefix?: string;
  className?: string;
}> = ({ status, ariaLabelPrefix = "Estat:", className = "" }) => {
  if (!status) return null;

  const displayText =
    status.state === "past"
      ? "Finalitzat"
      : status.state === "live"
      ? "En curs"
      : status.label;

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 label font-semibold ${
        stateStyles[status.state]
      } ${className}`}
      aria-label={`${ariaLabelPrefix} ${status.label}`}
    >
      {displayText}
    </span>
  );
};

export default EventStatusBadge;
