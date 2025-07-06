// Type definitions for SEO structured data
export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface WebPageOptions {
  title: string;
  description: string;
  url: string;
  breadcrumbs?: BreadcrumbItem[];
  isPartOf?: string;
  mainContentOfPage?: Record<string, unknown>;
}

export interface CollectionPageOptions {
  title: string;
  description: string;
  url: string;
  breadcrumbs?: BreadcrumbItem[];
  mainEntity?: Record<string, unknown>;
  numberOfItems?: number;
}

export interface NavigationItem {
  name: string;
  url: string;
}
