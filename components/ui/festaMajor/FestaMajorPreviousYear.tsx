import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import { formatShortDateRange } from "@utils/date-helpers";
import { MONTHS_URL } from "@utils/constants";
import type { FestaMajorPreviousYearProps } from "types/props";

/** Last year's festes, each linking to that month's archive of the town. */
export default function FestaMajorPreviousYear({
  title,
  linkLabel,
  editions,
  townSlug,
  year,
  locale,
  ownFestaLabel,
}: FestaMajorPreviousYearProps) {
  return (
    <section className="stack gap-2 w-full">
      <h2 className="heading-2">{title}</h2>
      <ul className="stack gap-2 w-full">
        {editions.map((edition) => {
          const month = MONTHS_URL[Number(edition.start.slice(5, 7)) - 1];
          const dates = formatShortDateRange(
            edition.start,
            edition.end,
            locale,
          );
          return (
            <li
              key={`${edition.key}-${edition.start}`}
              className="border-b border-border/30 pb-2 w-full"
            >
              <span className="body-normal font-semibold">
                {edition.label ?? ownFestaLabel}
              </span>
              <span className="block body-small text-muted-foreground">
                {dates}
                {month && (
                  <>
                    {dates && " · "}
                    <PressableAnchor
                      href={`/sitemap/${townSlug}/${year}/${month}`}
                      className="text-primary hover:text-primary-dark transition-colors"
                      variant="inline"
                      prefetch={false}
                    >
                      {linkLabel}
                    </PressableAnchor>
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
