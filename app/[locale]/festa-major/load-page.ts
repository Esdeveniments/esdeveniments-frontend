import { notFound, permanentRedirect } from "next/navigation";
import { fetchFestaMajorPage } from "@lib/api/festes-majors";
import { FESTES_MAJORS_SEGMENT } from "@utils/constants";
import { withLocalePath } from "@utils/i18n-seo";
import { isValidPlace } from "@utils/route-validation";
import type { AppLocale } from "types/i18n";

/**
 * proxy.ts answers unknown places (404), aliases (301) and catalunya first;
 * these checks only cover renders that skip it. An unknown festa renders a
 * noindex notice: telling it apart needs the backend.
 */
export async function loadFestaMajorPage(
  place: string,
  festa: string | undefined,
  locale: AppLocale,
) {
  if (place === "catalunya") {
    permanentRedirect(withLocalePath(`/${FESTES_MAJORS_SEGMENT}`, locale));
  }
  if (!isValidPlace(place)) notFound();
  return fetchFestaMajorPage(place, festa);
}
