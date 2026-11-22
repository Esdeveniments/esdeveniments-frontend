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
import { formatShortDateRange } from "@utils/date-helpers";
import { isProductionSiteUrl } from "@utils/production-host";
import { isMalformedEventSlug } from "@utils/event-slug-quality";
import { isExpiredEventDates } from "@utils/event-helpers";
import { descriptionToPlainLine } from "@utils/event-excerpt";
import { truncateAtWord } from "@utils/string-helpers";

// --- Default robots policy for indexable pages ---
export const DEFAULT_ROBOTS_POLICY = {
  index: true,
  follow: true,
  "max-image-preview": "large" as const,
  "max-snippet": -1,
  "max-video-preview": -1,
};

// --- Sanitization/Truncation helpers ---
function sanitizeAndTrim(str: string = ""): string {
  return str.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
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

const META_TITLE_MAX = 60;
// A dated title may run a bit longer: search results cut the tail, but the
// date still tells ca/es/en pages (and repeat editions) apart.
const META_TITLE_WITH_DATE_MAX = 70;
const META_DESCRIPTION_MAX = 156;
const META_DESCRIPTION_SHORT = 120;

// --- Meta Title/Description Generators ---
export function generateMetaTitle(
  title: string,
  description?: string,
  location?: string,
  town?: string,
  region?: string,
  dateLabel?: string,
): string {
  const titleSanitized = sanitizeAndTrim(title);
  const maxLength = dateLabel ? META_TITLE_WITH_DATE_MAX : META_TITLE_MAX;
  let metaTitle = dateLabel
    ? `${smartTruncate(titleSanitized, maxLength - dateLabel.length - 6)} | ${dateLabel}`
    : smartTruncate(titleSanitized, maxLength);
  const titleParts = [];
  if (location) titleParts.push(sanitizeAndTrim(location));
  if (town && sanitizeAndTrim(town) !== titleParts[0])
    titleParts.push(sanitizeAndTrim(town));
  if (region && !titleParts.includes(sanitizeAndTrim(region)))
    titleParts.push(sanitizeAndTrim(region));
  titleParts.forEach((part) => {
    metaTitle = appendIfFits(metaTitle, part, maxLength);
  });
  if (
    description &&
    sanitizeAndTrim(description) !== "" &&
    metaTitle.length < maxLength - 10
  ) {
    metaTitle = appendIfFits(metaTitle, sanitizeAndTrim(description), maxLength);
  }
  return metaTitle;
}

function normalizeSentences(
  sentences?: string | readonly string[],
): string[] {
  if (!sentences) return [];
  const list = typeof sentences === "string" ? [sentences] : sentences;
  return list.map((raw) => raw?.trim() ?? "").filter(Boolean);
}

// Pads a short description with the first candidate sentence that fits whole
// within META_DESCRIPTION_MAX. Pass candidates longest-first to avoid dead zones
// between short and near-threshold bases.
export function appendSentenceIfShort(
  base: string,
  sentences?: string | readonly string[],
): string {
  if (base.length >= META_DESCRIPTION_SHORT) return base;
  const candidates = normalizeSentences(sentences);
  if (candidates.length === 0) return base;
  const separator = /[.!?…]$/.test(base) ? " " : ". ";
  for (const addition of candidates) {
    const candidate = `${base}${separator}${addition}`;
    if (candidate.length <= META_DESCRIPTION_MAX) return candidate;
  }
  return base;
}

export function fitMetaDescription(
  base: string,
  sentences?: string | readonly string[],
): string {
  const cleaned = sanitizeAndTrim(base);
  if (!cleaned) return "";
  if (cleaned.length > META_DESCRIPTION_MAX) {
    return truncateAtWord(cleaned, META_DESCRIPTION_MAX - 1);
  }
  return appendSentenceIfShort(cleaned, sentences);
}

// --- Open Graph/SEO Metadata Generator ---
export function generateEventMetadata(
  event: EventDetailResponseDTO,
  url?: string,
  prefixTitle?: string,
  locale: AppLocale = DEFAULT_LOCALE,
  descriptionSuffix?: string | readonly string[],
): Metadata {
  if (!event) return { title: "No event found" };

  const localeToUse = locale ?? DEFAULT_LOCALE;
  const isDefaultLocale = localeToUse === DEFAULT_LOCALE;

  // The backend metaTitle and metaDescription are Catalan, so only the default
  // locale uses them; non-default locales generate localized date/venue metadata.
  const enhancedTitle =
    event.metaTitle?.trim() && isDefaultLocale
      ? event.metaTitle.trim()
      : generateMetaTitle(
          event.title,
          isDefaultLocale ? event.description : undefined,
          event.location,
          event.city?.name,
          event.region?.name,
          formatShortDateRange(event.startDate, event.endDate, localeToUse),
        );

  const pageTitle =
    prefixTitle && prefixTitle.length > 0
      ? `${prefixTitle}: ${enhancedTitle}`
      : enhancedTitle;

  let finalDescription: string;
  if (event.metaDescription?.trim() && isDefaultLocale) {
    finalDescription = appendSentenceIfShort(
      event.metaDescription.trim(),
      descriptionSuffix,
    );
  } else {
    const { formattedStart, formattedEnd } = getFormattedDate(
      event.startDate,
      event.endDate,
      localeToUse,
    );
    // The start is built to pair with the end: in ca/es a same-month range
    // starts with just the day number, so it is never used alone.
    const dateLabel = formattedEnd
      ? `${formattedStart} – ${formattedEnd}`
      : formattedStart;
    const placePart =
      event.location?.trim() ||
      event.city?.name?.trim() ||
      event.region?.name?.trim() ||
      "";
    // Facts first (title, date, place), then the description as plain text:
    // a long description only loses its own tail, cut once, so the date and
    // place that tell similar events apart are never cut.
    const lead = truncateAtWord(
      [event.title, dateLabel, placePart]
        .map(sanitizeAndTrim)
        .filter(Boolean)
        .join(" - "),
      META_DESCRIPTION_MAX,
    );
    const teaser = descriptionToPlainLine(event.description, event.title);
    const withTeaser =
      lead.length < META_DESCRIPTION_SHORT && teaser
        ? truncateAtWord(`${lead} - ${teaser}`, META_DESCRIPTION_MAX)
        : lead;
    const suffixCandidates = normalizeSentences(descriptionSuffix);
    if (isDefaultLocale) {
      finalDescription = appendSentenceIfShort(withTeaser, suffixCandidates);
    } else if (suffixCandidates.length > 0) {
      // Event descriptions are Catalan: when localized suffixes are available,
      // never fall back to Catalan prose on es/en pages.
      finalDescription = appendSentenceIfShort(lead, suffixCandidates);
    } else {
      finalDescription = withTeaser;
    }
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
    robots: (() => {
      // Block non-production hosts (preview deployments, staging) from indexing.
      // The proxy emits X-Robots-Tag at the response level for these hosts;
      // this meta tag is defense-in-depth in case the header is stripped by
      // a CDN.
      //
      // IMPORTANT: only emit noindex on positive evidence of non-production.
      // The Dockerfile strips NEXT_PUBLIC_SITE_URL from the runner stage
      // (only set in the builder), so at runtime it may be undefined in
      // production too. Fail-open: undefined env = trust the default policy.
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
      const isKnownNonProd = !!siteUrl && !isProductionSiteUrl(siteUrl);
      if (
        process.env.NEXT_PUBLIC_VERCEL_ENV === "preview" ||
        isKnownNonProd
      ) {
        return "noindex, nofollow";
      }
      // Noindex events with slugs corrupted by upstream RSS/XML feed imports.
      // Pattern: backend generated slugs from titles containing inline HTML
      // (<link>https://...</link>, <description><![CDATA[...]]>) producing
      // tokens like "linkhttps", "linkdescription", "cdata". GSC reported
      // ~1,127 such 404/soft-404 entries in April 2026. Until the backend
      // slug generator is fixed, mark these noindex so Google drops them.
      if (isMalformedEventSlug(event.slug)) {
        return { index: false, follow: true };
      }
      // Noindex events that ended more than 60 days ago to save crawl budget.
      if (isExpiredEventDates(event)) {
        return { index: false, follow: true };
      }
      return DEFAULT_ROBOTS_POLICY;
    })(),
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
      // Use updatedAt if available, otherwise fall back to startDate
      ...((event.updatedAt || event.startDate) && {
        "article:modified_time": event.updatedAt || event.startDate,
      }),
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
