export type ChangeFreq =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

export interface SitemapImage {
  loc: string;
  title: string;
}

export interface SitemapField {
  loc: string;
  /** Omitted when there is no real modification date (Google ignores or distrusts guessed values). */
  lastmod?: string;
  changefreq: ChangeFreq;
  priority: number;
  image?: SitemapImage;
  alternates?: Record<string, string>; // hreflang -> URL (include x-default)
}

export interface BuildSitemapOptions {
  includeImage?: boolean;
}

export type UrlField = Omit<SitemapField, "image">;

export interface SitemapContentProps {
  dataPromise: Promise<{
    regions: import("./api/event").RegionSummaryResponseDTO[];
    cities: import("./api/city").CitySummaryResponseDTO[];
  }>;
  locale: import("./i18n").AppLocale;
}

export interface SitemapHeaderProps {
  placePromise: Promise<import("./common").PlaceTypeAndLabel>;
}
