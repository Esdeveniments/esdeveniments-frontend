import type { NewsCardGridProps } from "types/props";
import List from "@components/ui/list";
import NewsCard from "@components/ui/newsCard";
import { resolveNewsItemPlace } from "@utils/news-helpers";

// News cards in the same grid as the event listings. Each card links to the
// article's own city/region (the page's place is only the fallback), so the
// click doesn't take a redirect.
export default function NewsCardGrid({
  items,
  place,
  placeLabel,
  headingLevel,
}: NewsCardGridProps) {
  return (
    <List events={items}>
      {(item) => {
        const itemPlace = resolveNewsItemPlace(item, place, placeLabel);
        return (
          <NewsCard
            event={item}
            placeSlug={itemPlace.slug}
            placeLabel={itemPlace.label}
            headingLevel={headingLevel}
          />
        );
      }}
    </List>
  );
}
