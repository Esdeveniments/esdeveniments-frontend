export const sendEventToGA = (
  filterName: string,
  filterValue: string
): void => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "filter_change", {
      event_category: "Filter",
      event_label: `${filterName}: ${filterValue}`,
    });
  }
};

export const env: string =
  process.env.NODE_ENV !== "production"
    ? "dev"
    : process.env.NEXT_PUBLIC_VERCEL_ENV === "preview" ||
      process.env.NEXT_PUBLIC_VERCEL_ENV === "development"
    ? "staging"
    : "prod";

export const getRegionFromQuery = (q: string): string => {
  const parts = q.split(" ");
  if (parts.length > 1) {
    return parts[parts.length - 1];
  }
  return "";
};
