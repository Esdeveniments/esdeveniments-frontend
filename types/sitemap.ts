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
  lastmod: string;
  changefreq: ChangeFreq;
  priority: number;
  image?: SitemapImage;
}

export interface BuildSitemapOptions {
  includeImage?: boolean;
}

export type UrlField = Omit<SitemapField, "image">;
