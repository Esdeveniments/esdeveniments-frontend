// components/partials/WebsiteSchema.tsx
import { siteUrl } from "@config/index";
import { WebsiteSchemaProps } from "types/props";

export default function WebsiteSchema({ nonce }: WebsiteSchemaProps) {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}#website`,
    name: "Esdeveniments.cat",
    alternateName: "Esdeveniments Catalunya",
    url: siteUrl,
    description: "Descobreix esdeveniments culturals a Catalunya",
    inLanguage: "ca",
    sameAs: [
      "https://www.facebook.com/esdevenimentscat",
      "https://www.instagram.com/esdevenimentscat",
      "https://www.tiktok.com/@esdevenimentscat",
      "https://x.com/esdeveniments",
    ],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/catalunya/?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    publisher: {
      "@type": "Organization",
      name: "Esdeveniments.cat",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/static/images/logo-seo-meta.webp`,
      },
    },
  };

  return (
    <script
      id="website-schema"
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(websiteSchema).replace(/</g, "\\u003c"),
      }}
    />
  );
}
