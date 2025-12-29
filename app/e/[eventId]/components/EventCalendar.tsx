import { CalendarIcon, ClockIcon } from "@heroicons/react/24/outline";
import { siteUrl } from "@config/index";
import { getFormattedDate } from "@utils/helpers";
import { formatEventTimeDisplayDetail } from "@utils/date-helpers";
import { getTranslations } from "next-intl/server";
import type { EventCalendarProps } from "types/event";
import AddToCalendar from "@components/ui/addToCalendar";
import SectionHeading from "@components/ui/common/SectionHeading";
import { getLocaleSafely } from "@utils/i18n-seo";

export default async function EventCalendar({ event }: EventCalendarProps) {
  const locale = await getLocaleSafely();
  const t = await getTranslations({
    locale,
    namespace: "Components.EventCalendar",
  });
  const tTime = await getTranslations({
    locale,
    namespace: "Utils.EventTime",
  });
  const timeLabels = {
    consult: tTime("consult"),
    startsAt: tTime("startsAt", { time: "{time}" }),
    range: tTime("range", { start: "{start}", end: "{end}" }),
    simpleRange: tTime("simpleRange", { start: "{start}", end: "{end}" }),
  };

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
    locale
  );

  const eventDate = formattedEnd
    ? `Del ${formattedStart} al ${formattedEnd}`
    : `${nameDay}, ${formattedStart}`;

  return (
    <div className="w-full">
      <div className="w-full flex flex-col gap-element-gap min-w-0">
        <SectionHeading
          Icon={CalendarIcon}
          iconClassName="h-5 w-5 text-foreground-strong flex-shrink-0"
          title={t("title")}
          titleClassName="heading-2"
        />
        <div className="w-full flex flex-col gap-element-gap px-section-x">
          <p className="body-normal font-semibold text-foreground-strong">
            {eventDate}
          </p>
          <p className="body-normal flex items-center gap-element-gap text-foreground-strong/80">
            <ClockIcon className="w-4 h-4 text-foreground-strong/70" />
            {formatEventTimeDisplayDetail(startTime, endTime, timeLabels)}
          </p>
        </div>
        <div className="px-section-x">
          <AddToCalendar
            title={title}
            description={description}
            location={`${location}, ${city?.name || ""}, ${region?.name || ""}, ${city?.postalCode || ""}`}
            startDate={startDate}
            endDate={endDate}
            canonical={`${siteUrl}/e/${slug}`}
          />
        </div>
      </div>
    </div>
  );
}
