import { CalendarIcon } from "@heroicons/react/outline";
import { siteUrl } from "@config/index";
import { getFormattedDate } from "@utils/helpers";
import type { EventCalendarProps } from "types/event";
import AddToCalendar from "@components/ui/addToCalendar";

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
    <div className="w-full flex justify-center items-start gap-2 px-4">
      <CalendarIcon className="w-5 h-5 mt-1" />
      <div className="w-11/12 flex flex-col gap-4">
        <h2>Data i hora</h2>
        <div className="w-full flex flex-col gap-4">
          <p>{eventDate}</p>
          <p className="capitalize">
            {!startTime || startTime === "00:00"
              ? "Consultar horaris"
              : `${startTime} - ${endTime || ""}`}
          </p>
        </div>
        <AddToCalendar
          title={title}
          description={description}
          location={`${location}, ${city?.name || ""}, ${region?.name || ""}, ${
            city?.postalCode || ""
          }`}
          startDate={startDate}
          endDate={endDate}
          canonical={`${siteUrl}/e/${slug}`}
        />
      </div>
    </div>
  );
}
