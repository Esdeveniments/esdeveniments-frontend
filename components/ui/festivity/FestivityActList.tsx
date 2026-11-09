import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import Thumbnail from "@components/ui/common/image/Thumbnail";
import { formatShortDateRange } from "@utils/date-helpers";
import type { FestivityActListProps } from "types/props";

/** Compact rows (town, then title, dates and region), each linking to its event. */
export default function FestivityActList({
  title,
  intro,
  items,
  locale,
  muted = false,
}: FestivityActListProps) {
  if (items.length === 0) return null;
  return (
    <section className="stack gap-2 w-full">
      <h2 className="heading-2">{title}</h2>
      {intro && <p className="body-normal text-foreground/80">{intro}</p>}
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 w-full">
        {items.map((item) => (
          <li key={item.id} className="border-b border-border/30 pb-2">
            <PressableAnchor
              href={`/e/${item.slug}`}
              className="group flex items-center gap-3"
              variant="inline"
              prefetch={false}
            >
              <Thumbnail
                image={item.imageUrl}
                label={item.cityName}
                muted={muted}
              />
              <span className="min-w-0">
                <span
                  className={`block body-normal font-semibold group-hover:text-primary transition-colors ${muted ? "text-muted-foreground" : ""}`}
                >
                  {item.cityName}
                </span>
                <span className="block body-small text-muted-foreground">
                  {[
                    item.title,
                    formatShortDateRange(item.startDate, item.endDate, locale),
                    item.regionName,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
            </PressableAnchor>
          </li>
        ))}
      </ul>
    </section>
  );
}
