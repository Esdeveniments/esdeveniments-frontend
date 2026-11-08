import { getTranslations } from "next-intl/server";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import Thumbnail from "@components/ui/common/image/Thumbnail";
import { formatShortDateRange } from "@utils/date-helpers";
import { formatMonthHeading } from "@utils/festa-major";
import { groupByMonth } from "@utils/festa-major-calendar";
import { festaMajorPath, monthAnchorId } from "@utils/festa-major-paths";
import type { FestaMajorTownListProps } from "types/props";

/** Towns by the month of their festa, in the given order; last-year-only towns show those dates. */
export default async function FestaMajorTownList({
  towns,
  locale,
  headingLevel,
  today,
  monthAnchors,
  showRegion = true,
}: FestaMajorTownListProps) {
  const t = await getTranslations({ locale, namespace: "Pages.FestaMajor" });
  const Heading = headingLevel;

  return (
    <div className="stack gap-6 w-full">
      {groupByMonth(towns, today).map(([month, monthTowns]) => (
        <section
          key={month}
          id={monthAnchors ? monthAnchorId(month) : undefined}
          className="stack gap-2 w-full scroll-mt-4 nav:scroll-mt-20"
        >
          <Heading className="heading-3">
            {formatMonthHeading(`2000-${month}-01`, locale)}
          </Heading>
          <ul className="stack gap-2 w-full">
            {monthTowns.map((town) => {
              const dates = formatShortDateRange(
                town.main.start,
                town.main.end,
                locale,
              );
              return (
                <li
                  key={town.slug}
                  className="border-b border-border/30 pb-2 w-full"
                >
                  <PressableAnchor
                    href={festaMajorPath(town.slug)}
                    className="group flex items-center gap-3"
                    variant="inline"
                    prefetch={false}
                  >
                    <Thumbnail image={town.main.imageUrl} label={town.name} />
                    <span className="min-w-0">
                      <span className="block body-normal font-semibold group-hover:text-primary transition-colors">
                        {town.name}
                      </span>
                      <span className="block body-small text-muted-foreground">
                        {[
                          town.main.label,
                          dates,
                          town.isCurrentYear
                            ? null
                            : t("lastYearDates", { year: town.year }),
                          showRegion ? town.regionName : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                  </PressableAnchor>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
