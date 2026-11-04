import { revalidatePath } from "next/cache";
import { SUPPORTED_LOCALES } from "types/i18n";

/**
 * Expires the event detail page in every locale, for each slug.
 * revalidatePath matches the route path after rewrites, and proxy.ts rewrites
 * unprefixed URLs to /ca/..., so every locale needs its prefix, even the default.
 */
export function revalidateEventPages(slugs: Iterable<string>): void {
  try {
    for (const slug of new Set(slugs)) {
      for (const locale of SUPPORTED_LOCALES) {
        revalidatePath(`/${locale}/e/${slug}`);
      }
    }
  } catch {
    // revalidatePath is a no-op outside of a render context in some environments
  }
}
