import EventStatusGroup from "./EventStatusGroup";
import SectionHeading from "@components/ui/common/SectionHeading";
import { GlobeAltIcon, ClockIcon, UserIcon } from "@heroicons/react/24/outline";
const GlobeIcon = GlobeAltIcon;
import type { EventDetailResponseDTO } from "types/api/event";
import type { EventTemporalStatus } from "types/event-status";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import { formatEventTimeDisplayDetail } from "@utils/date-helpers";
import { useTranslations } from "next-intl";
import { Link } from "@i18n/routing";

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
                data-analytics-link-type="event_website"
                data-analytics-context="event_details"
                data-analytics-event-id={event.id ? String(event.id) : ""}
                data-analytics-event-slug={event.slug || ""}
                variant="inline"
                disableNavigationSignal
              >
                {event.title}
              </PressableAnchor>
            </div>
          )}

          {event.profile && (
            <div className="body-normal flex items-center gap-2 text-foreground-strong">
              <UserIcon className="w-4 h-4 flex-shrink-0" />
              <Link
                href={`/perfil/${event.profile.slug}` as `/${string}`}
                className="text-primary hover:underline"
              >
                {event.profile.name}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetailsSection;
