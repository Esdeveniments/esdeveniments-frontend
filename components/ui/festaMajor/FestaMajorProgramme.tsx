import { getTranslations } from "next-intl/server";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import {
  formatEventTimeDisplay,
  formatShortDateRange,
} from "@utils/date-helpers";
import {
  actHasPage,
  formatDayHeading,
  groupByDay,
} from "@utils/festa-major";
import { festaAnchorId } from "@utils/festa-major-paths";
import type { FestaMajorProgrammeProps } from "types/props";

/**
 * A festa's acts by day: one section per festa when there are several. With an
 * `id`, each festa's first section is also an anchor (festaAnchorId).
 */
export default async function FestaMajorProgramme({
  id,
  title,
  editions,
  locale,
  today,
  mutePast = false,
  ownFestaLabel,
}: FestaMajorProgrammeProps) {
  const tTime = await getTranslations({ locale, namespace: "Utils.EventTime" });
  const timeLabels = {
    consult: tTime("consult"),
    startsAt: tTime("startsAt", { time: "{time}" }),
    range: tTime("range", { start: "{start}", end: "{end}" }),
    simpleRange: tTime("simpleRange", { start: "{start}", end: "{end}" }),
  };
  const showEditionHeadings = editions.length > 1;
  const DayHeading = showEditionHeadings ? "h4" : "h3";
  const anchored = new Set<string>();

  return (
    <section
      id={id}
      className="stack gap-6 w-full scroll-mt-4 nav:scroll-mt-20"
    >
      <h2 className="heading-2">{title}</h2>
      {editions.map((edition) => {
        const dates = formatShortDateRange(edition.start, edition.end, locale);
        const anchor =
          id && !anchored.has(edition.key) ? festaAnchorId(edition.key) : null;
        if (anchor) anchored.add(edition.key);
        return (
          <div
            key={`${edition.key}-${edition.start}`}
            id={anchor ?? undefined}
            className="stack gap-4 w-full scroll-mt-4 nav:scroll-mt-20"
          >
            {showEditionHeadings && (
              <h3 className="heading-3">
                {edition.label ?? ownFestaLabel}
                {dates && (
                  <span className="body-normal text-muted-foreground">
                    {" "}
                    · {dates}
                  </span>
                )}
              </h3>
            )}
            {groupByDay(edition.acts).map(([day, acts]) => (
              <div
                key={day}
                className={`stack gap-2 w-full ${mutePast && day < today ? "opacity-70" : ""}`}
              >
                <DayHeading className="heading-4">
                  <time dateTime={day}>{formatDayHeading(day, locale)}</time>
                </DayHeading>
                <ul className="stack gap-2 w-full">
                  {acts.map((act) => {
                    const linked = actHasPage(act, today);
                    const content = (
                      <>
                        <span
                          className={`body-normal font-semibold ${linked ? "group-hover:text-primary transition-colors" : ""}`}
                        >
                          {act.title}
                        </span>
                        <span className="flex flex-col sm:flex-row sm:gap-2 body-small text-muted-foreground">
                          <span>
                            {formatEventTimeDisplay(
                              act.startTime,
                              act.endTime,
                              timeLabels,
                            )}
                          </span>
                          {act.location && (
                            <>
                              <span className="hidden sm:inline">•</span>
                              <span>{act.location}</span>
                            </>
                          )}
                        </span>
                      </>
                    );
                    return (
                      <li
                        key={act.id}
                        className="border-b border-border/30 pb-2 w-full"
                      >
                        {linked ? (
                          <PressableAnchor
                            href={`/e/${act.slug}`}
                            className="group block"
                            variant="inline"
                            prefetch={false}
                          >
                            {content}
                          </PressableAnchor>
                        ) : (
                          <div>{content}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        );
      })}
    </section>
  );
}
