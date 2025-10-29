import { CalendarIcon, ClockIcon } from "@heroicons/react/outline";
import { siteUrl } from "@config/index";
import { getFormattedDate } from "@utils/helpers";
import type { EventCalendarProps } from "types/event";
import AddToCalendar from "@components/ui/addToCalendar";
import SectionHeading from "@components/ui/common/SectionHeading";

export default function EventCalendar({ event }: EventCalendarProps) {
  // Extract needed fields
  const {
    title,
    description,
    location,
    city,
    region,
    startDate,
    endDate,
    slug,
    startTime,
    endTime,
  } = event;

  const { formattedStart, formattedEnd, nameDay } = getFormattedDate(
    startDate,
    endDate
  );

  const eventDate = formattedEnd
    ? `Del ${formattedStart} al ${formattedEnd}`
    : `${nameDay}, ${formattedStart}`;

  return (
    <div className="w-full">
      <div className="w-full flex flex-col gap-4 min-w-0">
        <SectionHeading
          Icon={CalendarIcon}
          iconClassName="h-5 w-5 text-foreground-strong flex-shrink-0"
          title="Data i hora"
        />
        <div className="w-full flex flex-col gap-4 px-4">
          <p className="body-normal font-semibold text-foreground-strong">
            {eventDate}
          </p>
          <p className="body-normal capitalize flex items-center gap-element-gap text-foreground-strong/80">
            <ClockIcon className="w-4 h-4 text-foreground-strong/70" />
            {!startTime || startTime === "00:00"
              ? "Consultar horaris"
              : `${startTime} - ${endTime || ""}`}
          </p>
        </div>
        <div className="px-4">
          <AddToCalendar
            title={title}
            description={description}
            location={`${location}, ${city?.name || ""}, ${
              region?.name || ""
            }, ${city?.postalCode || ""}`}
            startDate={startDate}
            endDate={endDate}
            canonical={`${siteUrl}/e/${slug}`}
          />
        </div>
      </div>
    </div>
  );
}
