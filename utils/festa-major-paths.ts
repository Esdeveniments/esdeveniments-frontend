import type { FestaMajorHubEvent } from "types/festa-major";
import { FESTA_MAJOR_SEGMENT } from "./constants";
import { isFestaMajorTitle } from "./festa-major-name";

export const festaMajorPath = (place: string, festa?: string): string =>
  `/${FESTA_MAJOR_SEGMENT}/${place}${festa ? `/${festa}` : ""}`;

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
