import { siteUrl } from "@config/index";
import { EventSummaryResponseDTO } from "types/api/event";

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
  description?: string
) {
  if (!events || events.length === 0) return null;

  const itemListElements = events.slice(0, 20).map((event, index) => {
    // Build location object with proper null checks
    const locationData: any = {
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
        "@id": `${siteUrl}/e/${event.slug}`,
        name: event.title,
        url: `${siteUrl}/e/${event.slug}`,
        startDate: event.startDate,
        endDate: event.endDate || event.startDate,
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: locationData,
        organizer: {
          "@type": "Organization",
          name: "Esdeveniments.cat",
          url: siteUrl,
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
    "@id": `${siteUrl}#itemlist-${listName
      ?.toLowerCase()
      .replace(/\s+/g, "-")}`,
    name: listName,
    description: description || `Llista d'esdeveniments culturals: ${listName}`,
    numberOfItems: events.length,
    itemListElement: itemListElements,
  };
}

export function buildPageMeta({
  title,
  description,
  canonical,
  image = `${siteUrl}/static/images/logo-seo-meta.webp`,
}: {
  title: string;
  description: string;
  canonical: string;
  image?: string;
}) {
  const { openGraph, twitter, ...restDefaults } = defaultMeta;

  const baseMeta = {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      ...openGraph,
      title,
      description,
      url: canonical,
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
      "twitter:url": canonical,
      "twitter:image:src": image,
      "twitter:image:alt": title,
    },
    // SEO Guru Enhancement: Add language targeting
    languages: {
      "ca-ES": canonical, // Catalan (primary)
    },
  };

  return baseMeta;
}
