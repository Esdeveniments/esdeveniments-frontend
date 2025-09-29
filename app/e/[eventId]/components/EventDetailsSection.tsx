import EventStatusGroup from "./EventStatusGroup";
import { GlobeAltIcon as GlobeIcon } from "@heroicons/react/outline";
import type { EventDetailResponseDTO } from "types/api/event";
import type { EventTemporalStatus } from "types/event-status";
import Link from "next/link";

const EventDetailsSection: React.FC<{
  event: EventDetailResponseDTO;
  temporalStatus: EventTemporalStatus;
  formattedStart?: string | null;
  formattedEnd?: string | null;
  nameDay?: string | null;
}> = ({ event, temporalStatus, formattedStart, formattedEnd, nameDay }) => {
  if (!event) return null;

  return (
    <div className="w-full flex justify-center items-start gap-2 px-4">
      <GlobeIcon className="w-5 h-5 mt-1" />
      <div className="w-11/12 flex flex-col gap-4">
        <h2>Detalls de l&apos;Esdeveniment</h2>
        <div className="flex justify-start items-center gap-2">
          <div className="flex flex-col gap-0.5 flex-1">
            <EventStatusGroup
              temporalStatus={temporalStatus}
              formattedStart={formattedStart}
              formattedEnd={formattedEnd}
              nameDay={nameDay}
            />

            {event.duration && (
              <div className="text-blackCorp/70">
                Durada aproximada: {event.duration}
              </div>
            )}

            {event.url && (
              <div className="font-bold">
                <Link
                  href={event.url}
                  className="underline font-normal ml-1"
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
    </div>
  );
};

export default EventDetailsSection;
