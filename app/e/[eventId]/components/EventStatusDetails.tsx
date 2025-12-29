import { ClockIcon } from "@heroicons/react/24/outline";
import { getTranslations } from "next-intl/server";
import type { EventStatusDetailsProps } from "types/props";

const contentClassName =
  "flex items-center gap-element-gap-sm body-normal text-foreground-strong/70";

const EventStatusDetails = async ({
  temporalStatus,
  formattedStart,
  formattedEnd,
  nameDay,
  timeDisplay,
  className = "",
}: EventStatusDetailsProps) => {
  if (!temporalStatus) return null;

  const t = await getTranslations("Utils.EventStatus");

  const liveContent =
    temporalStatus.state === "live"
      ? temporalStatus.endsIn || timeDisplay
      : null;
  const upcomingContent =
    temporalStatus.state === "upcoming"
      ? temporalStatus.startsIn || timeDisplay
      : null;

  const pastContent =
    temporalStatus.state === "past"
      ? formattedEnd && formattedStart
        ? t("dateRangePast", { start: formattedStart, end: formattedEnd })
        : [nameDay, formattedStart].filter(Boolean).join(", ")
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

      {pastContent && (
        <div className={contentClassName}>
          {t("endedOn")} {pastContent}
        </div>
      )}
    </div>
  );
};

export default EventStatusDetails;
