// Centralized meta/SEO helpers for the entire project
import { siteUrl } from "@config/index";
import type { Metadata } from "next";
import type { EventDetailResponseDTO } from "types/api/event";

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
  prefixTitle?: string
): Metadata {
  if (!event) return { title: "No event found" };
  const pageTitle = prefixTitle
    ? `${prefixTitle}: ${event.title}`
    : event.title;
  const image = event.imageUrl ? [event.imageUrl] : [];
  const canonical = url || `${siteUrl}/e/${event.slug}`;
  return {
    title: pageTitle,
    description: event.description,
    openGraph: {
      title: pageTitle,
      description: event.description,
      url: canonical,
      images: image,
      type: "article",
      siteName: "Esdeveniments.cat",
      locale: "ca-ES",
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: event.description,
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
