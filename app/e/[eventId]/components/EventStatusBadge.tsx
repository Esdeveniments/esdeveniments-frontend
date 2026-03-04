import { useTranslations } from "next-intl";
import type { EventStatusMeta, EventTemporalStatus } from "types/event-status";

const stateStyles: Record<EventStatusMeta["state"], string> = {
  past: "bg-foreground-strong/10 text-foreground-strong border border-foreground-strong/20",
  live: "bg-primary text-primary-foreground border border-primary-dark animate-pulse",
  upcoming: "bg-primary/10 text-primary border border-primary/20",
};

/**
 * Extract countdown detail from full EventTemporalStatus (discriminated union).
 * Returns `startsIn` for upcoming, `endsIn` for live, nothing for past.
 */
function getCountdown(
  status: EventStatusMeta | EventTemporalStatus
): string | undefined {
  if (status.state === "upcoming" && "startsIn" in status) {
    return status.startsIn;
  }
  if (status.state === "live" && "endsIn" in status) {
    return status.endsIn;
  }
  return undefined;
}

const EventStatusBadge: React.FC<{
  status?: EventStatusMeta | EventTemporalStatus | null;
  ariaLabelPrefix?: string;
  className?: string;
}> = ({ status, ariaLabelPrefix, className = "" }) => {
  const t = useTranslations("Utils.EventStatusBadge");
  if (!status) return null;

  const displayText =
    status.state === "past"
      ? t("past")
      : status.state === "live"
        ? t("live")
        : status.label;

  const countdown = getCountdown(status);
  const ariaPrefix = ariaLabelPrefix ?? t("ariaLabelPrefix");

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 label font-semibold ${stateStyles[status.state]
        } ${className}`}
      aria-label={`${ariaPrefix} ${status.label}${countdown ? ` — ${countdown}` : ""}`}
    >
      {displayText}
      {countdown && (
        <span className="font-normal opacity-90 normal-case tracking-normal">· {countdown}</span>
      )}
    </span>
  );
};

export default EventStatusBadge;
