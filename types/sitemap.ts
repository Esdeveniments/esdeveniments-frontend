export interface UrlField {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: number;
}

export interface SitemapImage {
  loc: string;
  title: string;
}

export interface SitemapField {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: number;
  image?: SitemapImage;
}

export interface BuildSitemapOptions {
  includeImage?: boolean;
  includeNews?: boolean;
}
