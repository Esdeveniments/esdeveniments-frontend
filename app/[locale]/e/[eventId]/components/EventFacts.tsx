import { CalendarIcon, ClockIcon, MapPinIcon, TicketIcon } from "@heroicons/react/24/outline";
import {
  formatEventDateLabel,
  formatEventTimeDisplayDetail,
} from "@utils/date-helpers";
import { formatPriceText, getEventPriceText, isFreePriceText } from "@utils/event-price";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import type { EventFactsProps } from "types/event";
import type { AppLocale } from "types/i18n";

const rowClassName = "body-normal flex items-start gap-2";
// 16 px icon nudged to the centre of the first line.
const iconClassName = "w-4 h-4 mt-1 flex-shrink-0 text-muted-foreground";

/**
 * When, where and how much: the facts a visitor scans for. One component for
 * the mobile header and the desktop sidebar card, so both read the same way.
 */
export default async function EventFacts({
  event,
  placeText,
  placeOnlyOnDesktop = false,
  className = "",
}: EventFactsProps) {
  const locale = (await rootLocale()) as AppLocale;
  const [t, tTime, tCalendar, tPage] = await Promise.all([
    getTranslations({ locale, namespace: "Components.EventCalendar" }),
    getTranslations({ locale, namespace: "Utils.EventTime" }),
    getTranslations({ locale, namespace: "Utils.Calendar" }),
    getTranslations({ locale, namespace: "Components.EventPage" }),
  ]);

  const dateText = formatEventDateLabel(event.startDate, event.endDate, locale, (start, end) =>
    tCalendar("dateRange", { start, end }),
  );
  const timeText = formatEventTimeDisplayDetail(event.startTime, event.endTime, {
    consult: tTime("consult"),
    startsAt: tTime("startsAt", { time: "{time}" }),
    range: tTime("range", { start: "{start}", end: "{end}" }),
    simpleRange: tTime("simpleRange", { start: "{start}", end: "{end}" }),
  });
  const duration = event.duration?.trim();
  const priceText = getEventPriceText(event.price);
  // In the header on desktop, date and price live in the sidebar card instead.
  const timeRowClass = placeOnlyOnDesktop ? "lg:hidden" : "";

  return (
    <div className={`flex flex-col gap-1 min-w-0 ${className}`}>
      <p className={`${rowClassName} text-foreground-strong ${timeRowClass}`}>
        <CalendarIcon className={iconClassName} aria-hidden="true" />
        <span className="font-semibold">{dateText}</span>
      </p>
      <p className={`${rowClassName} text-muted-foreground ${timeRowClass}`}>
        <ClockIcon className={iconClassName} aria-hidden="true" />
        <span>
          {timeText}
          {duration && ` · ${tPage("durationLabel", { duration })}`}
        </span>
      </p>
      {placeText && (
        <p className={`${rowClassName} text-muted-foreground`}>
          <MapPinIcon className={iconClassName} aria-hidden="true" />
          <span className="min-w-0 break-words">{placeText}</span>
        </p>
      )}
      {priceText && (
        // The icon names the row; the label is for screen readers only.
        <p className={`${rowClassName} ${timeRowClass}`} data-testid="event-price">
          <TicketIcon className={iconClassName} aria-hidden="true" />
          <span>
            <span className="sr-only">{t("priceLabel")} </span>
            {isFreePriceText(priceText) ? (
              <span className="font-semibold text-success-dark">{t("priceFree")}</span>
            ) : (
              <span className="font-semibold text-foreground-strong">
                {formatPriceText(priceText, locale)}
              </span>
            )}
          </span>
        </p>
      )}
    </div>
  );
}
