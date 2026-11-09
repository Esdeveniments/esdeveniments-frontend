import { getTranslations } from "next-intl/server";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import { formatShortDateRange } from "@utils/date-helpers";
import { festaLinkPath } from "@utils/festa-major-paths";
import type { FestaMajorFestaListProps } from "types/props";

/** A town's festes, each linking where festaLinkPath says. */
export default async function FestaMajorFestaList({
  festes,
  townSlug,
  currentYear,
  locale,
  title,
  ownFestaLabel,
}: FestaMajorFestaListProps) {
  if (festes.length < 2) return null;
  const t = await getTranslations({ locale, namespace: "Pages.FestaMajor" });

  return (
    <section className="stack gap-2 w-full">
      <h2 className="heading-2">{title}</h2>
      <ul className="stack gap-2 w-full">
        {festes.map((festa) => {
          const name = festa.label ?? ownFestaLabel;
          // Spans over a month have no date label, so no "dates del" either.
          const dates = formatShortDateRange(festa.start, festa.end, locale);
          const details =
            dates && festa.year !== currentYear
              ? `${dates} · ${t("lastYearDates", { year: festa.year })}`
              : dates;
          const href = festaLinkPath(townSlug, festa);
          const content = (
            <>
              <span
                className={`body-normal font-semibold ${href ? "text-primary group-hover:text-primary-dark transition-colors" : ""}`}
              >
                {name}
              </span>
              {details && (
                <span className="block body-small text-muted-foreground">
                  {details}
                </span>
              )}
            </>
          );
          return (
            <li
              key={festa.key || "own"}
              className="border-b border-border/30 pb-2 w-full"
            >
              {href ? (
                <PressableAnchor
                  href={href}
                  className="group block"
                  variant="inline"
                  prefetch={false}
                >
                  {content}
                </PressableAnchor>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
