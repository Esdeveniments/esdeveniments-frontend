import { CalendarIcon, ClockIcon } from "@heroicons/react/outline";
import { siteUrl } from "@config/index";
import { getFormattedDate } from "@utils/helpers";
import type { EventCalendarProps } from "types/event";
import AddToCalendar from "components/ui/domain/addToCalendar";
import { Text } from "@components/ui/primitives/Text";

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
    endDate,
  );

  const eventDate = formattedEnd
    ? `Del ${formattedStart} al ${formattedEnd}`
    : `${nameDay}, ${formattedStart}`;

  return (
    <div className="flex w-full items-start justify-center gap-component-xs px-component-md">
      <CalendarIcon className="mt-component-xs h-5 w-5" />
      <div className="flex w-11/12 flex-col gap-component-md">
        <Text as="h2">Data i hora</Text>
        <div className="flex w-full flex-col gap-component-md">
          <Text variant="body" className="font-bold">
            {eventDate}
          </Text>
          <Text
            variant="body"
            className="flex items-center gap-component-xs capitalize"
          >
            <ClockIcon className="h-4 w-4 text-blackCorp/70" />
            {!startTime || startTime === "00:00"
              ? "Consultar horaris"
              : `${startTime} - ${endTime || ""}`}
          </Text>
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
