// components/partials/WebsiteSchema.tsx
import Script from "next/script";
import { siteUrl } from "@config/index";

export default function WebsiteSchema() {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}#website`,
    name: "Esdeveniments.cat",
    alternateName: "Esdeveniments Catalunya",
    url: siteUrl,
    description: "Descobreix esdeveniments culturals a Catalunya",
    inLanguage: "ca",
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
      logo: `${siteUrl}/static/images/logo-seo-meta.webp`,
    },
  };

  return (
    <Script
      id="website-schema"
      type="application/ld+json"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
    />
  );
}
