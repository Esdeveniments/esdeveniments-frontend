// Only <image:loc>: Google dropped image:title/caption support in 2022.
export interface SitemapImage {
  loc: string;
}

// No changefreq/priority: Google ignores both, so they only add bytes.
export interface SitemapField {
  loc: string;
  /** Omitted when there is no real modification date (Google ignores or distrusts guessed values). */
  lastmod?: string;
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
