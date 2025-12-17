import { isValidDateSlug } from "@lib/dates";

export function extractPlaceDateCategorySlugsFromHref(
  href: string
): {
  placeSlug?: string;
  dateSlug?: string;
  categorySlug?: string;
} {
  const path = href.split("?")[0] || "";
  const segments = path.split("/").filter(Boolean);

  const placeSlug = segments[0] || undefined;
  const second = segments[1] || "";
  const third = segments[2] || "";

  if (!placeSlug) return {};

  if (second && isValidDateSlug(second)) {
    return {
      placeSlug,
      dateSlug: second,
      categorySlug: third || undefined,
    };
  }

  if (third && isValidDateSlug(third)) {
    return {
      placeSlug,
      dateSlug: third,
      categorySlug: second || undefined,
    };
  }

  return {
    placeSlug,
    categorySlug: second || undefined,
  };
}
