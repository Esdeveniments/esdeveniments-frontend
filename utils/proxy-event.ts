import type { NextRequest } from "next/server";
import { getExpiredFestaActTown } from "@lib/api/events-proxy";
import { MONTHS_URL } from "@utils/constants";
import { isExpiredEvent } from "@utils/event-helpers";
import { festaMajorPath } from "@utils/festa-major-paths";

// Event slugs end with the start date and the id:
// festa-major-cardedeu-2025-13-de-agost-del-2025-92d1olka3cpd3n80jabfkku9s0
const SLUG_DATE_RE =
  /-(\d{1,2})-de-([a-z]+)-del-(\d{4})-(?:[a-z0-9]{26}|[0-9a-f-]{36})$/;

const slugStartDate = (slug: string): Date | undefined => {
  const match = SLUG_DATE_RE.exec(slug);
  const month = match ? MONTHS_URL.indexOf(match[2]) : -1;
  if (!match || month === -1) return undefined;
  return new Date(Date.UTC(Number(match[3]), month, Number(match[1])));
};

/**
 * Festa major acts 301 to their town's hub once they expire, instead of
 * staying as noindexed pages: the ranking they built moves to the hub that
 * has next year's programme. Only slugs that say "festa-major" and started
 * more than EXPIRED_EVENT_NOINDEX_DAYS ago reach the backend: an act that
 * started later can't have expired.
 */
export async function checkExpiredFestaAct(
  request: NextRequest,
  pathnameWithoutLocale: string,
  localeFromPath: string | null,
): Promise<URL | null> {
  if (request.method !== "GET" && request.method !== "HEAD") return null;

  const [segment, slug, ...rest] = pathnameWithoutLocale
    .split("/")
    .filter(Boolean);
  if (
    segment !== "e" ||
    !slug ||
    rest.length > 0 ||
    !slug.includes("festa-major") ||
    !isExpiredEvent(slugStartDate(slug))
  )
    return null;

  const town = await getExpiredFestaActTown(slug);
  if (!town) return null;
  const url = request.nextUrl.clone();
  url.pathname = `${localeFromPath ? `/${localeFromPath}` : ""}${festaMajorPath(town)}`;
  return url;
}
