import EventStatusGroup from "./EventStatusGroup";
import { GlobeAltIcon as GlobeIcon } from "@heroicons/react/outline";
import type { EventDetailResponseDTO } from "types/api/event";
import type { EventTemporalStatus } from "types/event-status";
import Link from "next/link";
import { ClockIcon } from "@heroicons/react/outline";
import { Text } from "components/ui/primitives/Text";

const EventDetailsSection: React.FC<{
  event: EventDetailResponseDTO;
  temporalStatus: EventTemporalStatus;
  formattedStart?: string | null;
  formattedEnd?: string | null;
  nameDay?: string | null;
}> = ({ event, temporalStatus, formattedStart, formattedEnd, nameDay }) => {
  if (!event) return null;

  return (
    <div className="flex w-full items-start justify-center gap-component-xs px-component-md">
      <GlobeIcon className="mt-component-xs h-5 w-5" />
      <div className="flex w-11/12 flex-col gap-component-md">
        <Text as="h2" variant="h2">
          Detalls de l&apos;Esdeveniment
        </Text>
        <div className="flex items-center justify-start gap-component-xs">
          <div className="flex flex-1 flex-col gap-xs.5">
            <EventStatusGroup
              temporalStatus={temporalStatus}
              formattedStart={formattedStart}
              formattedEnd={formattedEnd}
              nameDay={nameDay}
            />

            {event.duration && (
              <div className="flex items-center gap-component-xs">
                <ClockIcon className="h-4 w-4" />
                <Text variant="body-sm" color="muted">
                  Durada aproximada: {event.duration}
                </Text>
              </div>
            )}

            {event.url && (
              <div>
                <Text variant="body" className="font-bold">
                  Enllaç a l&apos;esdeveniment:{" "}
                </Text>
                <Link
                  href={event.url}
                  className="pb-xs.1 inline-block border-b-2 border-blackCorp/20 transition-colors duration-200 hover:border-primary hover:text-primary"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Text variant="body" className="font-medium">
                    {event.title}
                  </Text>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailsSection;
