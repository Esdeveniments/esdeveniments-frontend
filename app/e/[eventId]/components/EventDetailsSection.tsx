import EventStatusGroup from "./EventStatusGroup";
import SectionHeading from "@components/ui/common/SectionHeading";
import { GlobeAltIcon as GlobeIcon } from "@heroicons/react/outline";
import type { EventDetailResponseDTO } from "types/api/event";
import type { EventTemporalStatus } from "types/event-status";
import Link from "next/link";
import { ClockIcon } from "@heroicons/react/outline";

const EventDetailsSection: React.FC<{
  event: EventDetailResponseDTO;
  temporalStatus: EventTemporalStatus;
  formattedStart?: string | null;
  formattedEnd?: string | null;
  nameDay?: string | null;
}> = ({ event, temporalStatus, formattedStart, formattedEnd, nameDay }) => {
  if (!event) return null;

  return (
    <div className="w-full">
      <div className="w-full flex flex-col gap-4 min-w-0">
        <SectionHeading
          Icon={GlobeIcon}
          iconClassName="h-5 w-5 text-foreground-strong flex-shrink-0"
          title="Detalls de l'Esdeveniment"
        />
        <div className="flex flex-col px-4 gap-4">
          <EventStatusGroup
            temporalStatus={temporalStatus}
            formattedStart={formattedStart}
            formattedEnd={formattedEnd}
            nameDay={nameDay}
          />

          {event.duration && (
            <div className="body-small flex items-center gap-element-gap text-foreground-strong/70">
              <ClockIcon className="w-4 h-4" />
              Durada aproximada: {event.duration}
            </div>
          )}

          {event.url && (
            <div className="body-normal font-semibold text-foreground-strong">
              Enllaç a l&apos;esdeveniment:{" "}
              <Link
                href={event.url}
                className="body-normal inline-block text-foreground-strong hover:text-primary transition-colors duration-200 border-b-2 border-foreground-strong/20 hover:border-primary pb-0"
                target="_blank"
                rel="noreferrer"
              >
                {event.title}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetailsSection;
