import EventStatusGroup from "./EventStatusGroup";
import SectionHeading from "@components/ui/common/SectionHeading";
import { GlobeAltIcon as GlobeIcon } from "@heroicons/react/outline";
import type { EventDetailResponseDTO } from "types/api/event";
import type { EventTemporalStatus } from "types/event-status";
import { ClockIcon } from "@heroicons/react/outline";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import { formatEventTimeDisplayDetail } from "@utils/date-helpers";
import { useTranslations } from "next-intl";

const EventDetailsSection: React.FC<{
  event: EventDetailResponseDTO;
  temporalStatus: EventTemporalStatus;
  formattedStart?: string | null;
  formattedEnd?: string | null;
  nameDay?: string | null;
}> = ({ event, temporalStatus, formattedStart, formattedEnd, nameDay }) => {
  const t = useTranslations("Components.EventDetailsSection");
  const tTime = useTranslations("Utils.EventTime");
  const timeLabels = {
    consult: tTime("consult"),
    startsAt: tTime("startsAt", { time: "{time}" }),
    range: tTime("range", { start: "{start}", end: "{end}" }),
    simpleRange: tTime("simpleRange", { start: "{start}", end: "{end}" }),
  };

  const timeDisplay = formatEventTimeDisplayDetail(
    event.startTime,
    event.endTime,
    timeLabels
  );

  return (
    <div className="w-full">
      <div className="w-full flex flex-col gap-element-gap min-w-0">
        <SectionHeading
          Icon={GlobeIcon}
          iconClassName="h-5 w-5 text-foreground-strong flex-shrink-0"
          title={t("title")}
          titleClassName="heading-2"
        />
        <div className="flex flex-col px-section-x gap-element-gap">
          <EventStatusGroup
            temporalStatus={temporalStatus}
            formattedStart={formattedStart}
            formattedEnd={formattedEnd}
            nameDay={nameDay}
            timeDisplay={timeDisplay}
          />

          {event.duration && (
            <div className="body-small flex items-center gap-element-gap text-foreground-strong/70">
              <ClockIcon className="w-4 h-4" />
              {t("duration", { duration: event.duration })}
            </div>
          )}

          {event.url && (
            <div className="body-normal font-semibold text-foreground-strong">
              {t("eventLink")}{" "}
              <PressableAnchor
                href={event.url}
                className="body-normal inline-block text-primary hover:underline transition-colors duration-200 ease-in-out pb-0"
                target="_blank"
                rel="noreferrer"
                variant="inline"
                disableNavigationSignal
              >
                {event.title}
              </PressableAnchor>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetailsSection;
