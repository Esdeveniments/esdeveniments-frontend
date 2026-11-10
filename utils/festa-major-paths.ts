import type { FestaMajorFestaLink, FestaMajorHubEvent } from "types/festa-major";
import { FESTA_MAJOR_SEGMENT } from "./constants";
import { isFestaMajorTitle } from "./festa-major-name";

export const festaMajorPath = (place: string): string =>
  `/${FESTA_MAJOR_SEGMENT}/${place}`;

/** The id of a month ("01"–"12") in the festes majors calendar. */
export const monthAnchorId = (month: string): string => `mes-${month}`;

/** The id of a festa's part of a hub programme ("" is the town's own festa). */
export const festaAnchorId = (key: string): string => `festa-${key || "major"}`;

/**
 * Where a festa in a town's list links: its part of the hub's programme, or
 * its first act when the programme shows another year. Null when that act's
 * page is gone.
 */
export const festaLinkPath = (
  townSlug: string,
  festa: FestaMajorFestaLink,
): string | null =>
  festa.inProgramme
    ? `${festaMajorPath(townSlug)}#${festaAnchorId(festa.key)}`
    : festa.firstActSlug
      ? `/e/${festa.firstActSlug}`
      : null;

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
