import { getTranslations } from "next-intl/server";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import Thumbnail from "@components/ui/common/image/Thumbnail";
import { formatShortDateRange } from "@utils/date-helpers";
import { formatMonthHeading } from "@utils/festa-major";
import { festaMajorPath } from "@utils/festa-major-paths";
import type { FestaMajorTownSummary } from "types/festa-major";
import type { FestaMajorTownListProps } from "types/props";

/** Towns by the month of their festa, in the given order; last-year-only towns show those dates. */
export default async function FestaMajorTownList({
  towns,
  locale,
  headingLevel,
  today,
}: FestaMajorTownListProps) {
  const t = await getTranslations({ locale, namespace: "Pages.FestaMajor" });
  const months = new Map<string, FestaMajorTownSummary[]>();
  for (const town of towns) {
    const date = today && town.main.start < today ? today : town.main.start;
    // By month only: last-year towns share this year's months.
    const month = date.slice(5, 7);
    months.set(month, [...(months.get(month) ?? []), town]);
  }
  const Heading = headingLevel;

  return (
    <div className="stack gap-6 w-full">
      {[...months].map(([month, monthTowns]) => (
        <section key={month} className="stack gap-2 w-full">
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
                          town.regionName,
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
