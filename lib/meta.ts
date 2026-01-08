// Centralized meta/SEO helpers for the entire project
import { siteUrl } from "@config/index";
import type { Metadata } from "next";
import type { EventDetailResponseDTO } from "types/api/event";
import {
  DEFAULT_LOCALE,
  localeToHrefLang,
  localeToOgLocale,
  type AppLocale,
} from "types/i18n";
import {
  applyLocaleToCanonical,
  buildLocalizedUrls,
  getSafePathname,
  stripLocaleFromPathname,
} from "@utils/i18n-seo";
import { getFormattedDate } from "@utils/helpers";

// --- Sanitization/Truncation helpers ---
function sanitizeInput(str: string = ""): string {
  return str.replace(/<[^>]*>/g, "").trim();
}

function sanitizeAndTrim(str: string = ""): string {
  return sanitizeInput(str).replace(/\s+/g, " ").trim();
}

function smartTruncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  let truncated = str.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > 0) truncated = truncated.slice(0, lastSpace);
  return truncated + "...";
}

function appendIfFits(base: string, addition: string, maxLength = 60): string {
  if (!addition) return base;
  const candidate = base ? `${base} | ${addition}` : addition;
  return candidate.length <= maxLength ? candidate : base;
}

// --- Meta Title/Description Generators ---
export function generateMetaTitle(
  title: string,
  description?: string,
  location?: string,
  town?: string,
  region?: string
): string {
  const titleSanitized = sanitizeAndTrim(title);
  let metaTitle = smartTruncate(titleSanitized, 60);
  const titleParts = [];
  if (location) titleParts.push(sanitizeAndTrim(location));
  if (town && sanitizeAndTrim(town) !== titleParts[0])
    titleParts.push(sanitizeAndTrim(town));
  if (region && !titleParts.includes(sanitizeAndTrim(region)))
    titleParts.push(sanitizeAndTrim(region));
  titleParts.forEach((part) => {
    metaTitle = appendIfFits(metaTitle, part);
  });
  if (
    description &&
    sanitizeAndTrim(description) !== "" &&
    metaTitle.length < 50
  ) {
    metaTitle = appendIfFits(metaTitle, sanitizeAndTrim(description));
  }
  return metaTitle;
}

export function generateMetaDescription(
  title: string,
  description?: string
): string {
  const titleSanitized = sanitizeInput(title);
  let metaDescription = titleSanitized;

  // Category information is handled via structured data (article:tag, article:section)
  // Keep description natural and benefit-driven per 2025 SEO best practices
  if (metaDescription.length < 120 && description) {
    const descriptionSanitized = sanitizeInput(description);
    metaDescription += ` - ${descriptionSanitized}`;
  }
  return smartTruncate(metaDescription, 156);
}

// --- Open Graph/SEO Metadata Generator ---
export function generateEventMetadata(
  event: EventDetailResponseDTO,
  url?: string,
  prefixTitle?: string,
  locale: AppLocale = DEFAULT_LOCALE
): Metadata {
  if (!event) return { title: "No event found" };

  const localeToUse = locale ?? DEFAULT_LOCALE;

  // Use backend metaTitle if available and non-empty, otherwise generate it
  const enhancedTitle = event.metaTitle?.trim()
    ? event.metaTitle.trim()
    : generateMetaTitle(
        event.title,
        event.description,
        event.location,
        event.city?.name,
        event.region?.name
      );

  const pageTitle =
    prefixTitle && prefixTitle.length > 0
      ? `${prefixTitle}: ${enhancedTitle}`
      : enhancedTitle;

  // Use backend metaDescription if available and non-empty, otherwise generate it
  let finalDescription: string;
  if (event.metaDescription?.trim()) {
    finalDescription = event.metaDescription.trim();
  } else {
    // Generate enhanced description like the old version
    const enhancedDescription = generateMetaDescription(
      event.title,
      event.description
    );
    // Enrich description with date and venue, keeping under 156 chars
    const { formattedStart } = getFormattedDate(
      event.startDate,
      event.endDate,
      localeToUse
    );
    const descriptionParts = [enhancedDescription];
    if (formattedStart && formattedStart.trim().length > 0) {
      descriptionParts.push(formattedStart);
    }
    if (event.location && event.location.trim().length > 0) {
      descriptionParts.push(event.location);
    }
    finalDescription = smartTruncate(descriptionParts.join(" - "), 156);
  }

  const image = event.imageUrl ? [event.imageUrl] : [];
  const canonicalBase = url || `${siteUrl}/e/${event.slug}`;
  const canonical = applyLocaleToCanonical(canonicalBase, localeToUse);

  // Ensure we always generate alternates from a clean, non-localized pathname.
  // Otherwise a localized canonical (e.g. /es/e/slug) would become /es/es/e/slug.
  const basePathname = stripLocaleFromPathname(getSafePathname(canonicalBase));
  const localizedUrls = buildLocalizedUrls(basePathname);
  const languageAlternates = Object.entries(localizedUrls).reduce<
    Record<string, string>
  >((acc, [currentLocale, href]) => {
    const hrefLang =
      localeToHrefLang[currentLocale as AppLocale] ?? currentLocale;
    acc[hrefLang] = href;
    return acc;
  }, {});
  if (localizedUrls[DEFAULT_LOCALE]) {
    languageAlternates["x-default"] = localizedUrls[DEFAULT_LOCALE];
  }

  // Generate article tags for categories
  const articleTags = event.categories?.map((category) => category.name) || [];

  // Generate comprehensive keywords
  const keywordParts = [
    ...(event.categories?.map((cat) => cat.name) || []),
    event.city?.name,
    event.region?.name,
    event.location,
  ].filter(Boolean);
  const keywords =
    keywordParts.length > 0 ? keywordParts.join(", ") : undefined;

  return {
    title: pageTitle,
    description: finalDescription,
    ...(keywords && { keywords }),
    openGraph: {
      title: pageTitle,
      description: finalDescription,
      url: canonical,
      images: image,
      type: "article",
      siteName: "Esdeveniments.cat",
      locale: localeToOgLocale[localeToUse] ?? localeToOgLocale[DEFAULT_LOCALE],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: finalDescription,
      site: "@esdeveniments",
      creator: "Esdeveniments.cat",
      images: image,
    },
    robots:
      process.env.NEXT_PUBLIC_VERCEL_ENV === "preview"
        ? "noindex, nofollow"
        : "index, follow",
    alternates: {
      canonical,
      languages: languageAlternates,
    },
    other: {
      "fb:app_id": "103738478742219",
      "fb:pages": "103738478742219",
      author: "Esdeveniments.cat",
      "google-site-verification":
        process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "",
      "og:ttl": "777600",
      // Twitter alt text if supported by consuming platform
      "twitter:image:alt": pageTitle,
      "twitter:url": canonical,
      "twitter:domain": siteUrl,
      // Article time metadata for freshness signals
      // Use startDate as published time (when the event was created/announced)
      ...(event.startDate && {
        "article:published_time": event.startDate,
      }),
      // Use updatedAt if available, otherwise startDate
      ...(event.updatedAt
        ? { "article:modified_time": event.updatedAt }
        : event.startDate && { "article:modified_time": event.startDate }),
      // Article tags for better social media categorization
      ...(articleTags.length > 0 && {
        "article:tag": articleTags.join(","),
        "article:section": articleTags[0], // Primary category as section
      }),
    },
  };
}

// --- Canonical URL Helper ---
export function getCanonicalUrl(path: string): string {
  if (!path.startsWith("http")) {
    return `${siteUrl}${path.startsWith("/") ? path : "/" + path}`;
  }
  return path;
}
