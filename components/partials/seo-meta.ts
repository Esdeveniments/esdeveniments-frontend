import { siteUrl } from "@config/index";

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
  return {
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
  };
}
