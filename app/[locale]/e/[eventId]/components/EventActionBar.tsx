import { getTranslations } from "next-intl/server";
import { formatCardDate, formatEventTimeDisplay } from "@utils/date-helpers";
import { formatPriceText, getEventPriceText, isFreePriceText } from "@utils/event-price";
import { getEventLinkUrl } from "@utils/event-url";
import { buildCalendarEventData } from "@utils/event-helpers";
import type { EventActionBarProps } from "types/props";
import EventActionBarActions from "./EventActionBarActions";

const NO_TIME_LABELS = { consult: "", startsAt: "", range: "", simpleRange: "" };

/**
 * Mobile bottom bar: when + price on the left, one filled main action on the
 * right (Eventbrite, Fever, Meetup). Server-rendered and fixed, so it shows
 * from the first paint and can't shift the page; only the buttons hydrate.
 */
export default async function EventActionBar({ event, locale }: EventActionBarProps) {
  const [t, tCalendar] = await Promise.all([
    getTranslations({ locale, namespace: "Components.EventPage" }),
    getTranslations({ locale, namespace: "Components.EventCalendar" }),
  ]);
  const { cardDate } = formatCardDate(event.startDate, event.endDate, locale);
  const startTime = formatEventTimeDisplay(event.startTime, null, NO_TIME_LABELS);
  const priceText = getEventPriceText(event.price);
  const isFree = priceText ? isFreePriceText(priceText) : false;

  return (
    <div
      data-event-action-bar
      role="group"
      aria-label={t("toolbarAriaLabel")}
      className="fixed inset-x-0 bottom-[var(--mobile-nav-clearance)] z-40 h-[var(--event-action-bar-height)] border-t border-border bg-background/95 backdrop-blur-md lg:hidden"
    >
      <div className="flex h-full items-center gap-element-gap px-section-x">
        <div className="min-w-0 flex-1 leading-tight">
          <p className="body-small font-semibold text-foreground-strong truncate">{cardDate}</p>
          {(startTime || priceText) && (
            <p className="body-small text-muted-foreground truncate">
              {startTime}
              {startTime && priceText && " · "}
              {priceText && (
                <span className={isFree ? "font-semibold text-success-dark" : undefined}>
                  {isFree ? tCalendar("priceFree") : formatPriceText(priceText, locale)}
                </span>
              )}
            </p>
          )}
        </div>
        <EventActionBarActions
          eventSlug={event.slug}
          eventUrl={getEventLinkUrl(event.url)}
          moreInfoLabel={t("moreInfo")}
          calendar={buildCalendarEventData(event)}
        />
      </div>
    </div>
  );
}
