import { useTranslations } from "next-intl";
import type { EventStatusMeta, EventTemporalStatus } from "types/event-status";

const stateStyles: Record<EventStatusMeta["state"], string> = {
  past: "bg-muted text-foreground border border-border",
  live: "bg-primary text-primary-foreground border border-primary-dark",
  upcoming: "bg-primary/10 text-primary-dark border border-primary/20",
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
  const isLive = status.state === "live";

  // "Comença en 3 hores" already says it's upcoming, so it replaces the label.
  const label =
    status.state === "past" ? t("past") : isLive ? t("live") : shownCountdown || status.label;

  const pill = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-badge px-badge-x py-badge-y text-xs font-semibold ${stateStyles[status.state]}${className ? ` ${className}` : ""}`}
    >
      <span className="sr-only">{ariaLabelPrefix ?? t("ariaLabelPrefix")} </span>
      {/* A still dot: a looping pulse never stops (WCAG 2.2.2) and fades the text. */}
      {isLive && <span aria-hidden="true" className="w-1.5 h-1.5 shrink-0 rounded-full bg-current" />}
      {label}
    </span>
  );

  if (!isLive || !shownCountdown) return pill;

  // The countdown sits beside the pill as plain text, so the pill stays one short line.
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      {pill}
      <span className="whitespace-nowrap body-small text-foreground-strong">{shownCountdown}</span>
    </span>
  );
};

export default EventStatusBadge;
