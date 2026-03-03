import SectionHeading from "@components/ui/common/SectionHeading";
import { GlobeAltIcon, ClockIcon } from "@heroicons/react/24/outline";
const GlobeIcon = GlobeAltIcon;
import type { EventDetailsSectionProps } from "types/props";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import { useTranslations } from "next-intl";

/**
 * Renders ancillary event details: duration + external link.
 * Status badge and date/time info are intentionally NOT shown here
 * to avoid duplication (they already appear in EventHeader and EventCalendar).
 */
const EventDetailsSection: React.FC<EventDetailsSectionProps> = ({ event }) => {
  const t = useTranslations("Components.EventDetailsSection");

  const hasValidUrl = !!event.url && /^https?:\/\//i.test(event.url);

  // Only render if there's something to show
  if (!event.duration && !hasValidUrl) return null;

  return (
    <div className="w-full">
      <div className="w-full flex flex-col gap-element-gap min-w-0">
        <SectionHeading
          Icon={GlobeIcon}
          iconClassName="h-5 w-5 text-foreground-strong flex-shrink-0"
          title={t("title")}
          titleClassName="heading-2"
        />
        <div className="flex flex-col px-section-x gap-element-gap">
          {event.duration && (
            <div className="body-small flex items-center gap-element-gap text-foreground-strong/70">
              <ClockIcon className="w-4 h-4" />
              {t("duration", { duration: event.duration })}
            </div>
          )}

          {hasValidUrl && (
            <div className="body-normal font-semibold text-foreground-strong">
              {t("eventLink")}{" "}
              <PressableAnchor
                href={event.url}
                className="body-normal inline-block text-primary hover:underline transition-colors duration-200 ease-in-out pb-0"
                target="_blank"
                rel="noreferrer"
                data-analytics-link-type="event_website"
                data-analytics-context="event_details"
                data-analytics-event-id={event.id ? String(event.id) : ""}
                data-analytics-event-slug={event.slug || ""}
                variant="inline"
                disableNavigationSignal
              >
                {event.title}
              </PressableAnchor>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetailsSection;
