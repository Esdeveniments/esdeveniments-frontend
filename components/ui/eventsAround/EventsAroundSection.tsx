import EventsAroundServer from "@components/ui/eventsAround/EventsAroundServer";
import type { EventsAroundSectionProps } from "types/common";
import type { AppLocale } from "types/i18n";
import SectionHeading from "@components/ui/common/SectionHeading";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";

export default async function EventsAroundSection({
  events,
  title,
  bleed = false,
}: EventsAroundSectionProps) {
  if (!events || events.length === 0) return null;

  const locale = (await rootLocale()) as AppLocale;
  const t = await getTranslations({ locale, namespace: "Components.EventsAround" });
  const displayTitle = title || t("relatedEvents");

  return (
    <div className="w-full min-w-0">
      <div className="w-full mb-element-gap">
        <SectionHeading title={displayTitle} titleClassName="heading-2" />
      </div>
      <div className={`overflow-hidden min-w-0 ${bleed ? "-mx-section-x" : "w-full"}`}>
        <EventsAroundServer
          events={events}
          showJsonLd={false} // JSON-LD handled server-side for SEO
          title={displayTitle}
        />
      </div>
    </div>
  );
}
