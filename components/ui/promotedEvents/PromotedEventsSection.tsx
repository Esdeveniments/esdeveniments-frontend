import { getTranslations } from "next-intl/server";
import EventsAroundServer from "@components/ui/eventsAround/EventsAroundServer";
import SectionHeading from "@components/ui/common/SectionHeading";
import { getActivePromotedEvents } from "@lib/api/promotedEvents";
import { getLocaleSafely } from "@utils/i18n-seo";
import type { PromotionScope } from "types/event";

function scopeKey(scope: PromotionScope): string {
  return scope.type === "homepage" ? "homepage" : `${scope.type}-${scope.slug}`;
}

function scopePlaceSlug(scope: PromotionScope): string {
  return scope.type === "homepage" ? "homepage" : scope.slug;
}

export default async function PromotedEventsSection({
  scope,
}: {
  scope: PromotionScope;
}) {
  const promotedEvents = await getActivePromotedEvents(scope);
  if (promotedEvents.length === 0) {
    return null;
  }

  const locale = await getLocaleSafely();
  const t = await getTranslations({ locale, namespace: "Components.PromotedEvents" });
  const key = scopeKey(scope);

  return (
    <div className="container content-auto-section">
      <section className="py-section-y border-b">
        <SectionHeading title={t("title")} titleClassName="heading-2 text-foreground" />
        <div
          data-analytics-container="true"
          data-analytics-context="promoted_carousel"
          data-analytics-place-slug={scopePlaceSlug(scope)}
        >
          <EventsAroundServer
            events={promotedEvents}
            layout="horizontal"
            usePriority={false}
            isPromoted
            showJsonLd
            title={t("title")}
            jsonLdId={`promoted-events-${key}`}
          />
        </div>
      </section>
    </div>
  );
}
