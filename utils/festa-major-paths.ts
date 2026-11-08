import type { FestaMajorFestaLink, FestaMajorHubEvent } from "types/festa-major";
import { FESTA_MAJOR_PROGRAMME_ID, FESTA_MAJOR_SEGMENT } from "./constants";
import { isFestaMajorTitle } from "./festa-major-name";

export const festaMajorPath = (place: string, festa?: string): string =>
  `/${FESTA_MAJOR_SEGMENT}/${place}${festa ? `/${festa}` : ""}`;

/**
 * Where a festa in a town's list links: its own page, the hub's programme
 * (the town's own, unnamed festa) or, for a small named one, its first act.
 */
export function festaLinkPath(
  townSlug: string,
  festa: FestaMajorFestaLink,
): string {
  if (festa.hasPage) return festaMajorPath(townSlug, festa.key);
  if (festa.key === "") {
    return `${festaMajorPath(townSlug)}#${FESTA_MAJOR_PROGRAMME_ID}`;
  }
  return `/e/${festa.firstActSlug}`;
}

/** Town hubs a changed festa major act appears on (for IndexNow). */
export function festaMajorHubPathsFor(
  events: readonly (FestaMajorHubEvent | null | undefined)[],
): string[] {
  const paths = events.flatMap((event) =>
    event?.city?.slug && event.title && isFestaMajorTitle(event.title)
      ? [festaMajorPath(event.city.slug)]
      : [],
  );
  return [...new Set(paths)];
}
