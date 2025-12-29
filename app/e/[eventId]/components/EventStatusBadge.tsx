import { useTranslations } from "next-intl";
import type { EventStatusMeta, EventTemporalStatus } from "types/event-status";

const stateStyles: Record<EventStatusMeta["state"], string> = {
  past: "bg-foreground-strong/10 text-foreground-strong border border-foreground-strong/20",
  live: "bg-success text-background border border-success-dark animate-pulse",
  upcoming: "bg-info text-background border border-info-dark",
};

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

  const ariaPrefix = ariaLabelPrefix ?? t("ariaLabelPrefix");

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 label font-semibold ${stateStyles[status.state]
        } ${className}`}
      aria-label={`${ariaPrefix} ${status.label}`}
    >
      {displayText}
    </span>
  );
};

export default EventStatusBadge;
