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

// With large text the badge can still wrap; keep "3 hores" together when it does.
const keepNumberWithUnit = (text: string) => text.replace(/(\d) /g, "$1\u00A0");

const EventStatusBadge: React.FC<{
  status?: EventStatusMeta | EventTemporalStatus | null;
  ariaLabelPrefix?: string;
  className?: string;
}> = ({ status, ariaLabelPrefix, className = "" }) => {
  const t = useTranslations("Utils.EventStatusBadge");
  if (!status) return null;

  const countdown = getCountdown(status);
  const shownCountdown = countdown && keepNumberWithUnit(countdown);
  const ariaPrefix = ariaLabelPrefix ?? t("ariaLabelPrefix");

  // "Comença en 3 hores" already says it's upcoming, so it replaces the label.
  const displayText =
    status.state === "past"
      ? t("past")
      : status.state === "live"
        ? t("live")
        : shownCountdown || status.label;
  const detail = status.state === "live" ? shownCountdown : undefined;

  return (
    <span
      className={`inline-flex flex-wrap items-baseline gap-x-1.5 rounded-md px-2 py-1 label font-semibold ${stateStyles[status.state]
        } ${className}`}
      aria-label={`${ariaPrefix} ${status.label}${countdown ? ` — ${countdown}` : ""}`}
    >
      {detail ? <span className="whitespace-nowrap">{displayText}</span> : displayText}
      {/* Wraps as a whole onto its own line when the row is too narrow. */}
      {detail && (
        <span className="whitespace-nowrap font-normal opacity-90 normal-case tracking-normal">
          {detail}
        </span>
      )}
    </span>
  );
};

export default EventStatusBadge;
