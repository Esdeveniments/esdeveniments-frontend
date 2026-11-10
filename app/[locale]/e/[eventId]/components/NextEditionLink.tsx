import { getTranslations } from "next-intl/server";
import { CalendarIcon } from "@heroicons/react/24/outline";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import { fetchNextEdition } from "@lib/api/event-series";
import { formatCardDate } from "@utils/date-helpers";
import type { NextEditionLinkProps } from "types/props";

/**
 * On an ended event's page: a button to its next edition, when there is one.
 * It is the page's main action, so it uses a button, not a text link.
 */
export default async function NextEditionLink({
  event,
  locale,
}: NextEditionLinkProps) {
  const next = await fetchNextEdition(event).catch(() => null);
  if (!next) return null;
  const t = await getTranslations({
    locale,
    namespace: "Components.PastEventBanner",
  });
  // Card date style ("Ds. 5 des."): the year shows only when it isn't this one.
  const { cardDate } = formatCardDate(next.startDate, next.endDate, locale);
  return (
    <PressableAnchor
      href={`/e/${next.slug}`}
      className="btn-outline btn-sm self-start my-element-gap-sm"
      variant="inline"
      data-analytics-event-name="next_edition_click"
    >
      <CalendarIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
      {t("nextEdition", { dates: cardDate })}
      <span aria-hidden="true">→</span>
    </PressableAnchor>
  );
}
