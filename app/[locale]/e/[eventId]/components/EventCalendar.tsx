import { CalendarIcon, ClockIcon, TicketIcon } from "@heroicons/react/24/outline";
import { siteUrl } from "@config/index";
import {
  formatEventDateLabel,
  formatEventTimeDisplayDetail,
} from "@utils/date-helpers";
import { formatPriceText, getEventPriceText, isFreePriceText } from "@utils/event-price";
import { getTranslations } from "next-intl/server";
import type { EventCalendarProps } from "types/event";
import AddToCalendar from "@components/ui/addToCalendar";
import SectionHeading from "@components/ui/common/SectionHeading";
import { locale as rootLocale } from "next/root-params";
import type { AppLocale } from "types/i18n";

export default async function EventCalendar({ event, compact = false }: EventCalendarProps) {
  const locale = (await rootLocale()) as AppLocale;
  const [t, tTime, tCalendar] = await Promise.all([
    getTranslations({ locale, namespace: "Components.EventCalendar" }),
    getTranslations({ locale, namespace: "Utils.EventTime" }),
    getTranslations({ locale, namespace: "Utils.Calendar" }),
  ]);
  const timeLabels = {
    consult: tTime("consult"),
    startsAt: tTime("startsAt", { time: "{time}" }),
    range: tTime("range", { start: "{start}", end: "{end}" }),
    simpleRange: tTime("simpleRange", { start: "{start}", end: "{end}" }),
  };

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

  const eventDate = formatEventDateLabel(startDate, endDate, locale, (start, end) =>
    tCalendar("dateRange", { start, end }),
  );

  // Icon rows share one layout: 16 px icon nudged to the centre of the first 26 px line.
  const rowClassName = `body-normal flex items-start ${compact ? "gap-2" : "gap-element-gap"} text-muted-foreground`;
  const rowIconClassName = "w-4 h-4 mt-1 flex-shrink-0";

  const timeRow = (
    <p className={rowClassName}>
      <ClockIcon className={rowIconClassName} aria-hidden="true" />
      <span>{formatEventTimeDisplayDetail(startTime, endTime, timeLabels)}</span>
    </p>
  );

  // "Free" (or 0) is translated, a bare amount gets the euro sign, other text shows as written. Hidden when unknown.
  // The icon names the row; the label is for screen readers only.
  const priceText = getEventPriceText(event.price);
  const priceRow = priceText ? (
    <p className={rowClassName} data-testid="event-price">
      <TicketIcon className={rowIconClassName} aria-hidden="true" />
      <span>
        <span className="sr-only">{t("priceLabel")} </span>
        {isFreePriceText(priceText) ? (
          <span className="font-semibold text-success-dark">{t("priceFree")}</span>
        ) : (
          <span className="text-foreground-strong">
            {formatPriceText(priceText, locale)}
          </span>
        )}
      </span>
    </p>
  ) : null;

  const addToCalendar = (
    <AddToCalendar
      title={title}
      description={description}
      location={`${location}, ${city?.name || ""}, ${region?.name || ""}, ${city?.postalCode || ""}`}
      startDate={startDate}
      endDate={endDate}
      canonical={`${siteUrl}/e/${slug}`}
    />
  );

  const dateText = (
    <p className="body-normal font-semibold text-foreground-strong">{eventDate}</p>
  );

  if (compact) {
    return (
      <div className="w-full flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <CalendarIcon className="w-4 h-4 mt-1 flex-shrink-0 text-foreground-strong" aria-hidden="true" />
          {dateText}
        </div>
        {timeRow}
        {priceRow}
        {addToCalendar}
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-element-gap min-w-0">
      <SectionHeading
        Icon={CalendarIcon}
        iconClassName="h-5 w-5 text-foreground-strong flex-shrink-0"
        title={t("title")}
        titleClassName="heading-2"
      />
      <div className="w-full flex flex-col gap-element-gap px-section-x">
        {dateText}
        {timeRow}
        {priceRow}
      </div>
      <div className="px-section-x">{addToCalendar}</div>
    </div>
  );
}
