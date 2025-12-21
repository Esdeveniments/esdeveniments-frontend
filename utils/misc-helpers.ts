export const sendEventToGA = (
  filterName: string,
  filterValue: string,
  context?: string
): void => {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    const keyMap: Record<string, string> = {
      Place: "place",
      ByDate: "byDate",
      Category: "category",
      Distance: "distance",
    };
    const filterKey = keyMap[filterName] ?? filterName;

    window.gtag("event", "filter_change", {
      event_category: "Filter",
      event_label: `${filterName}: ${filterValue}`,
      filter_name: filterName,
      filter_key: filterKey,
      filter_value: filterValue,
      context,
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
