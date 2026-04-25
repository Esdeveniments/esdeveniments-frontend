// components/partials/WebsiteSchema.tsx
import { siteUrl, socialLinksSameAs } from "@config/index";
import { DEFAULT_LOCALE, localeToHrefLang, type AppLocale } from "types/i18n";
import JsonLdServer from "./JsonLdServer";

export default function WebsiteSchema({
  locale = DEFAULT_LOCALE,
}: {
  locale?: AppLocale;
}) {
  const inLanguage = localeToHrefLang[locale] ?? locale;

  const localized = {
    ca: {
      siteDescription: "Descobreix esdeveniments culturals a Catalunya",
      orgDescription:
        "Plataforma de descobriment d'esdeveniments culturals a Catalunya. Agenda d'activitats, concerts, teatre, exposicions i més.",
      appDescription:
        "Plataforma gratuïta i multilingüe per descobrir esdeveniments culturals a Catalunya. API pública REST, cerca per lloc, data i categoria.",
      areaName: "Catalunya",
      areaSameAs: "https://ca.wikipedia.org/wiki/Catalunya",
      knowsAbout: [
        "Esdeveniments culturals",
        "Concerts",
        "Teatre",
        "Exposicions",
        "Festivals",
        "Catalunya",
      ],
      featureList: [
        "Descobriment d'esdeveniments culturals",
        "Cerca per ubicació",
        "Filtratge per categoria",
        "API pública REST",
        "Multilingüe (català, castellà, anglès)",
      ],
    },
    es: {
      siteDescription: "Descubre eventos culturales en Cataluña",
      orgDescription:
        "Plataforma de descubrimiento de eventos culturales en Cataluña. Agenda de actividades, conciertos, teatro, exposiciones y más.",
      appDescription:
        "Plataforma gratuita y multilingüe para descubrir eventos culturales en Cataluña. API pública REST, búsqueda por lugar, fecha y categoría.",
      areaName: "Cataluña",
      areaSameAs: "https://es.wikipedia.org/wiki/Cataluña",
      knowsAbout: [
        "Eventos culturales",
        "Conciertos",
        "Teatro",
        "Exposiciones",
        "Festivales",
        "Cataluña",
      ],
      featureList: [
        "Descubrimiento de eventos culturales",
        "Búsqueda por ubicación",
        "Filtrado por categoría",
        "API pública REST",
        "Multilingüe (catalán, castellano, inglés)",
      ],
    },
    en: {
      siteDescription: "Discover cultural events in Catalonia",
      orgDescription:
        "Cultural events discovery platform for Catalonia. Browse concerts, theatre, exhibitions, festivals, and more.",
      appDescription:
        "Free multilingual platform to discover cultural events across Catalonia. Public REST API, search by place, date, and category.",
      areaName: "Catalonia",
      areaSameAs: "https://en.wikipedia.org/wiki/Catalonia",
      knowsAbout: [
        "Cultural events",
        "Concerts",
        "Theatre",
        "Exhibitions",
        "Festivals",
        "Catalonia",
      ],
      featureList: [
        "Cultural events discovery",
        "Location-based search",
        "Category filtering",
        "Public REST API",
        "Multilingual (Catalan, Spanish, English)",
      ],
    },
  }[locale] ?? {
    siteDescription: "Descobreix esdeveniments culturals a Catalunya",
    orgDescription:
      "Plataforma de descobriment d'esdeveniments culturals a Catalunya.",
    appDescription:
      "Plataforma gratuïta i multilingüe per descobrir esdeveniments culturals a Catalunya.",
    areaName: "Catalunya",
    areaSameAs: "https://ca.wikipedia.org/wiki/Catalunya",
    knowsAbout: ["Esdeveniments culturals", "Catalunya"],
    featureList: [
      "Descobriment d'esdeveniments culturals",
      "API pública REST",
    ],
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}#website`,
    name: "Esdeveniments.cat",
    alternateName: "Esdeveniments Catalunya",
    url: siteUrl,
    description: localized.siteDescription,
    inLanguage,
    sameAs: socialLinksSameAs,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/catalunya/?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    publisher: { "@id": `${siteUrl}#organization` },
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}#organization`,
    name: "Esdeveniments.cat",
    alternateName: "Esdeveniments Catalunya",
    url: siteUrl,
    logo: {
      "@type": "ImageObject",
      url: `${siteUrl}/static/images/logo-seo-meta.webp`,
    },
    description: localized.orgDescription,
    foundingDate: "2020",
    areaServed: {
      "@type": "AdministrativeArea",
      name: localized.areaName,
      sameAs: localized.areaSameAs,
    },
    knowsAbout: localized.knowsAbout,
    sameAs: socialLinksSameAs,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "info@esdeveniments.cat",
      availableLanguage: ["Catalan", "Spanish", "English"],
    },
  };

  const webAppSchema = {
    "@context": "https://schema.org",
    "@type": ["WebApplication", "SoftwareApplication"],
    "@id": `${siteUrl}#webapp`,
    name: "Esdeveniments.cat",
    alternateName: "Què Fer a Catalunya",
    description: localized.appDescription,
    url: siteUrl,
    applicationCategory: "EntertainmentApplication",
    applicationSubCategory: "Events Discovery",
    operatingSystem: "All",
    browserRequirements: "Requires HTML5",
    inLanguage: ["ca", "es", "en"],
    isAccessibleForFree: true,
    countriesSupported: "ES",
    offers: {
      "@type": "Offer",
      price: 0,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
    },
    featureList: localized.featureList,
    provider: { "@id": `${siteUrl}#organization` },
    publisher: { "@id": `${siteUrl}#organization` },
    screenshot: `${siteUrl}/static/images/og-home.jpg`,
    softwareHelp: { "@type": "CreativeWork", url: `${siteUrl}/llms.txt` },
    potentialAction: [
      {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${siteUrl}/catalunya/?search={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
      {
        "@type": "ViewAction",
        target: `${siteUrl}/openapi.json`,
        name: "View API Documentation",
      },
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name:
          locale === "es"
            ? "¿Qué es Esdeveniments.cat?"
            : locale === "en"
              ? "What is Esdeveniments.cat?"
              : "Què és Esdeveniments.cat?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            locale === "es"
              ? "Esdeveniments.cat es la plataforma gratuita y multilingüe más completa para descubrir eventos culturales en Cataluña. Cubre más de 900 municipios con conciertos, teatro, exposiciones, festivales y más."
              : locale === "en"
                ? "Esdeveniments.cat is the most comprehensive free multilingual platform for discovering cultural events across Catalonia. It covers 900+ municipalities with concerts, theatre, exhibitions, festivals, and more."
                : "Esdeveniments.cat és la plataforma gratuïta i multilingüe més completa per descobrir esdeveniments culturals a Catalunya. Cobreix més de 900 municipis amb concerts, teatre, exposicions, festivals i més.",
        },
      },
      {
        "@type": "Question",
        name:
          locale === "es"
            ? "¿Tiene Esdeveniments.cat una API pública?"
            : locale === "en"
              ? "Does Esdeveniments.cat have a public API?"
              : "Esdeveniments.cat té una API pública?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            locale === "es"
              ? "Sí, Esdeveniments.cat ofrece una API REST pública y gratuita. No requiere autenticación para endpoints de lectura. Documentación disponible en /llms.txt y /openapi.json."
              : locale === "en"
                ? "Yes, Esdeveniments.cat offers a free public REST API. No authentication is required for read endpoints. Documentation is available at /llms.txt and /openapi.json."
                : "Sí, Esdeveniments.cat ofereix una API REST pública i gratuïta. No requereix autenticació per als endpoints de lectura. Documentació disponible a /llms.txt i /openapi.json.",
        },
      },
    ],
  };

  return (
    <>
      <JsonLdServer id="website-schema" data={websiteSchema} />
      <JsonLdServer id="organization-schema" data={organizationSchema} />
      <JsonLdServer id="webapp-schema" data={webAppSchema} />
      <JsonLdServer id="faq-schema" data={faqSchema} />
    </>
  );
}
