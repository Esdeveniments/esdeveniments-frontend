import { getTranslations } from "next-intl/server";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import { formatShortDateRange } from "@utils/date-helpers";
import { festaMajorPath } from "@utils/festa-major-paths";
import type { FestaMajorFestaListProps } from "types/props";

/** A town's festes; named ones with enough acts (and not all of the hub's) link to their own page. */
export default async function FestaMajorFestaList({
  festes,
  townSlug,
  currentKey,
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
          const isCurrent = festa.key === currentKey;
          // A festa without its own page is part of the town hub.
          const link = isCurrent
            ? null
            : festa.hasPage
              ? festaMajorPath(townSlug, festa.key)
              : currentKey === undefined
                ? null
                : festaMajorPath(townSlug);
          const details = [
            formatShortDateRange(festa.start, festa.end, locale),
            t("actsCount", { count: festa.count }),
            festa.year === currentYear
              ? null
              : t("lastYearDates", { year: festa.year }),
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <li
              key={festa.key || "own"}
              className="border-b border-border/30 pb-2 w-full"
            >
              {link ? (
                <PressableAnchor
                  href={link}
                  className="group block"
                  variant="inline"
                  prefetch={false}
                >
                  <span className="body-normal font-semibold text-primary group-hover:text-primary-dark transition-colors">
                    {name}
                  </span>
                  <span className="block body-small text-muted-foreground">
                    {details}
                  </span>
                </PressableAnchor>
              ) : (
                <div aria-current={isCurrent ? "page" : undefined}>
                  <span className="body-normal font-semibold">{name}</span>
                  <span className="block body-small text-muted-foreground">
                    {details}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
