import { siteUrl } from "@config/index";
import { EventSummaryResponseDTO } from "types/api/event";
import { SchemaPlaceLocation } from "types/schema";
import {
  BreadcrumbItem,
  WebPageOptions,
  CollectionPageOptions,
  NavigationItem,
} from "types/common";
import {
  DEFAULT_LOCALE,
  localeToHrefLang,
  localeToOgLocale,
  type AppLocale,
} from "types/i18n";
import {
  buildLocalizedUrls,
  getSafePathname,
  stripLocaleFromPathname,
  toLocalizedUrl,
} from "@utils/i18n-seo";

export const defaultMeta = {
  openGraph: {
    siteName: "Esdeveniments.cat",
    locale: "ca-ES",
    type: "website",
    ttl: 777600,
    images: [
      {
        url: `${siteUrl}/static/images/logo-seo-meta.webp`,
        alt: "Esdeveniments.cat",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@esdeveniments",
    creator: "Esdeveniments.cat",
    images: [`${siteUrl}/static/images/logo-seo-meta.webp`],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
  authors: [{ name: "Esdeveniments.cat" }],
  other: {
    "fb:app_id": "103738478742219",
    "fb:pages": "103738478742219",
    "google-site-verification":
      process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    author: "Esdeveniments.cat",
    "revisit-after": "1 days",
  },
};

// Generate ItemList structured data for event collections
export function generateItemListStructuredData(
  events: EventSummaryResponseDTO[],
  listName: string,
  description?: string,
  locale?: AppLocale
) {
  if (!events || events.length === 0) return null;

  const localeToUse = locale ?? DEFAULT_LOCALE;

  const itemListIdBase = toLocalizedUrl("/", localeToUse);

  const itemListElements = events.slice(0, 20).map((event, index) => {
    // Build location object with proper null checks
    const locationData: SchemaPlaceLocation = {
      "@type": "Place",
      name: event.location,
    };

    // Only add address if we have city or region data
    if (event.city?.name || event.region?.name) {
      locationData.address = {
        "@type": "PostalAddress",
        addressCountry: "ES",
        ...(event.city?.name && { addressLocality: event.city.name }),
        ...(event.region?.name && { addressRegion: event.region.name }),
      };
    }

    return {
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Event",
        "@id": toLocalizedUrl(`/e/${event.slug}`, localeToUse),
        name: event.title,
        url: toLocalizedUrl(`/e/${event.slug}`, localeToUse),
        startDate: event.startDate,
        endDate: event.endDate || event.startDate,
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: locationData,
        organizer: {
          "@type": "Organization",
          name: "Esdeveniments.cat",
          url: itemListIdBase,
        },
        ...(event.imageUrl && {
          image: event.imageUrl,
        }),
        ...(event.description && {
          description: event.description,
        }),
      },
    };
  });

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${itemListIdBase}#itemlist-${listName
      ?.toLowerCase()
      .replace(/\s+/g, "-")}`,
    name: listName,
    description: description ?? listName,
    numberOfItems: events.length,
    itemListElement: itemListElements,
  };
}

export function buildPageMeta({
  title,
  description,
  canonical,
  image = `${siteUrl}/static/images/logo-seo-meta.webp`,
  locale,
}: {
  title: string;
  description: string;
  canonical: string;
  image?: string;
  locale?: AppLocale;
}) {
  const resolvedLocale = locale ?? DEFAULT_LOCALE;
  const basePathname = stripLocaleFromPathname(getSafePathname(canonical));
  const localizedUrls = buildLocalizedUrls(basePathname);
  const canonicalUrl = localizedUrls[resolvedLocale] ?? canonical;
  const languageAlternates = Object.entries(localizedUrls).reduce<
    Record<string, string>
  >((acc, [currentLocale, url]) => {
    const hrefLang =
      localeToHrefLang[currentLocale as AppLocale] ?? currentLocale;
    acc[hrefLang] = url;
    return acc;
  }, {});
  languageAlternates["x-default"] = localizedUrls[DEFAULT_LOCALE];

  const { openGraph, twitter, ...restDefaults } = defaultMeta;

  const baseMeta = {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: languageAlternates,
    },
    openGraph: {
      ...openGraph,
      locale: localeToOgLocale[resolvedLocale] ?? openGraph.locale,
      title,
      description,
      url: canonicalUrl,
      images: [{ url: image, alt: title }],
    },
    twitter: {
      ...twitter,
      title,
      description,
      images: [image],
    },
    ...restDefaults,
    robots:
      process.env.NEXT_PUBLIC_VERCEL_ENV === "preview"
        ? "noindex, nofollow"
        : "index, follow",
    other: {
      ...restDefaults.other,
      "twitter:domain": siteUrl,
      "twitter:url": canonicalUrl,
      "twitter:image:src": image,
      "twitter:image:alt": title,
    },
    languages: languageAlternates,
  };

  return baseMeta;
}

// Helper to derive a meaningful name from URL when breadcrumb name is missing
// Exported for testing
export const deriveNameFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    // Extract the last meaningful segment from the path
    const segments = pathname.split("/").filter((s) => s.length > 0);
    if (segments.length === 0) return null;

    const lastSegment = segments[segments.length - 1];
    // If it's a slug-like segment (e.g., "barcelona", "esdeveniment-123"),
    // try to make it more readable by replacing hyphens with spaces and capitalizing
    if (lastSegment.includes("-")) {
      return lastSegment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }
    // Otherwise, capitalize first letter
    return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1);
  } catch {
    return null;
  }
};

const BREADCRUMB_WARNING_LIMIT = 5;
const breadcrumbWarningCounts: Record<string, number> = {};

const shouldLogBreadcrumbWarnings =
  typeof process !== "undefined" &&
  (process.env.NODE_ENV !== "production" ||
    process.env.SCHEMA_WARNINGS === "1");

const logBreadcrumbWarning = (url: string | undefined, detail?: string) => {
  if (!shouldLogBreadcrumbWarnings) return;
  breadcrumbWarningCounts["empty-name"] =
    (breadcrumbWarningCounts["empty-name"] || 0) + 1;
  if (breadcrumbWarningCounts["empty-name"] > BREADCRUMB_WARNING_LIMIT) return;
  const parts = ["[breadcrumb-warning]", `url=${url ?? "unknown"}`];
  if (detail) parts.push(detail);
  console.warn(parts.join(" "));
};

// Sitemap-specific structured data helpers
export function generateBreadcrumbList(breadcrumbs: BreadcrumbItem[]) {
  if (!breadcrumbs || breadcrumbs.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${siteUrl}#breadcrumblist`,
    itemListElement: breadcrumbs.map((breadcrumb, index) => {
      // Ensure name is never empty (required by Google structured data)
      let name = breadcrumb.name;
      if (!name || name.trim() === "") {
        // Try to derive a meaningful name from the URL
        const derivedName = deriveNameFromUrl(breadcrumb.url);
        const fallbackName = derivedName || "Pàgina";
        name = fallbackName;
        logBreadcrumbWarning(
          breadcrumb.url,
          derivedName
            ? `derived name from URL: "${derivedName}"`
            : "using generic fallback for empty breadcrumb name"
        );
      }
      return {
        "@type": "ListItem",
        position: index + 1,
        name,
        item: breadcrumb.url,
      };
    }),
  };
}

export function generateWebPageSchema(options: WebPageOptions) {
  const { title, description, url, breadcrumbs, isPartOf, mainContentOfPage } =
    options;

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    name: title,
    description,
    url,
    inLanguage: "ca",
    isPartOf: isPartOf || {
      "@type": "WebSite",
      "@id": `${siteUrl}#website`,
      name: "Esdeveniments.cat",
      url: siteUrl,
    },
    about: { "@type": "Thing", name: title, description },
    publisher: {
      "@type": "Organization",
      name: "Esdeveniments.cat",
      url: siteUrl,
      logo: `${siteUrl}/static/images/logo-seo-meta.webp`,
    },
    ...(breadcrumbs && { breadcrumb: generateBreadcrumbList(breadcrumbs) }),
    ...(mainContentOfPage && { mainContentOfPage }),
  };
}

export function generateCollectionPageSchema(options: CollectionPageOptions) {
  const { title, description, url, breadcrumbs, mainEntity, numberOfItems } =
    options;

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#collectionpage`,
    name: title,
    description,
    url,
    inLanguage: "ca",
    isPartOf: {
      "@type": "WebSite",
      "@id": `${siteUrl}#website`,
      name: "Esdeveniments.cat",
      url: siteUrl,
    },
    about: { "@type": "Thing", name: title, description },
    publisher: {
      "@type": "Organization",
      name: "Esdeveniments.cat",
      url: siteUrl,
      logo: `${siteUrl}/static/images/logo-seo-meta.webp`,
    },
    ...(breadcrumbs && { breadcrumb: generateBreadcrumbList(breadcrumbs) }),
    ...(mainEntity && { mainEntity }),
    ...(numberOfItems && { numberOfItems }),
  };
}

export function generateSiteNavigationElementSchema(
  navigationItems: NavigationItem[]
) {
  if (!navigationItems || navigationItems.length === 0) return null;

  const normalizeToAbsoluteUrl = (value: string) => {
    if (/^https?:\/\//i.test(value)) return value;
    const normalized = value.startsWith("/") ? value : `/${value}`;
    return `${siteUrl}${normalized}`;
  };

  const fallbackPathFromName = (value: string) => {
    const slug = value
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `/${slug || "agenda"}`;
  };

  const navigationElements = navigationItems.map((item, index) => {
    const candidateUrl =
      item.url?.trim() ||
      item.href?.trim() ||
      fallbackPathFromName(item.name || `item-${index + 1}`);
    const absoluteUrl = normalizeToAbsoluteUrl(candidateUrl);

    return {
      "@type": "SiteNavigationElement",
      name: item.name,
      url: absoluteUrl,
    };
  });

  return {
    "@context": "https://schema.org",
    "@type": "SiteNavigationElement",
    "@id": `${siteUrl}#sitenavigation`,
    name: "Sitemap de Catalunya",
    url: `${siteUrl}/sitemap`,
    hasPart: navigationElements,
  };
}
