// components/partials/WebsiteSchema.tsx
import { siteUrl, socialLinksSameAs } from "@config/index";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  localeToHrefLang,
  type AppLocale,
} from "types/i18n";
import type { WebsiteSchemaProps } from "types/props";
import JsonLdServer from "./JsonLdServer";

const LOCALIZED_SCHEMA_COPY: Record<
  AppLocale,
  {
    siteDescription: string;
    orgDescription: string;
    appDescription: string;
    areaName: string;
    areaSameAs: string;
    knowsAbout: string[];
    featureList: string[];
    faq: Array<{ question: string; answer: string }>;
  }
> = {
  ca: {
    siteDescription: "Descobreix esdeveniments culturals a Catalunya",
    orgDescription:
      "Plataforma de descobriment d'esdeveniments culturals a Catalunya. Agenda d'activitats, concerts, teatre, exposicions i més.",
    appDescription:
      "Plataforma gratuïta i multilingüe per descobrir esdeveniments culturals a Catalunya. API pública REST, cerca per lloc, data i categoria.",
    areaName: "Catalunya",
    areaSameAs: "https://ca.wikipedia.org/wiki/Catalunya",
    knowsAbout: [
      "Agenda cultural",
      "Festes majors",
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
      "Multilingüe (català, castellà, anglès, francès)",
    ],
    faq: [
      {
        question: "Què és Esdeveniments.cat?",
        answer:
          "Esdeveniments.cat és la plataforma gratuïta i multilingüe més completa per descobrir esdeveniments culturals a Catalunya. Cobreix més de 900 municipis amb concerts, teatre, exposicions, festivals i més.",
      },
      {
        question: "Esdeveniments.cat té una API pública?",
        answer:
          "Sí, Esdeveniments.cat ofereix una API REST pública i gratuïta. No requereix autenticació per als endpoints de lectura. Documentació disponible a /llms.txt i /openapi.json.",
      },
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
      "Agenda cultural",
      "Fiestas mayores",
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
      "Multilingüe (catalán, castellano, inglés, francés)",
    ],
    faq: [
      {
        question: "¿Qué es Esdeveniments.cat?",
        answer:
          "Esdeveniments.cat es la plataforma gratuita y multilingüe más completa para descubrir eventos culturales en Cataluña. Cubre más de 900 municipios con conciertos, teatro, exposiciones, festivales y más.",
      },
      {
        question: "¿Tiene Esdeveniments.cat una API pública?",
        answer:
          "Sí, Esdeveniments.cat ofrece una API REST pública y gratuita. No requiere autenticación para endpoints de lectura. Documentación disponible en /llms.txt y /openapi.json.",
      },
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
      "Cultural agenda",
      "Festivals",
      "Cultural events",
      "Concerts",
      "Theatre",
      "Exhibitions",
      "Catalonia",
    ],
    featureList: [
      "Cultural events discovery",
      "Location-based search",
      "Category filtering",
      "Public REST API",
      "Multilingual (Catalan, Spanish, English, French)",
    ],
    faq: [
      {
        question: "What is Esdeveniments.cat?",
        answer:
          "Esdeveniments.cat is the most comprehensive free multilingual platform for discovering cultural events across Catalonia. It covers 900+ municipalities with concerts, theatre, exhibitions, festivals, and more.",
      },
      {
        question: "Does Esdeveniments.cat have a public API?",
        answer:
          "Yes, Esdeveniments.cat offers a free public REST API. No authentication is required for read endpoints. Documentation is available at /llms.txt and /openapi.json.",
      },
    ],
  },
  fr: {
    siteDescription: "Découvrez les événements culturels en Catalogne",
    orgDescription:
      "Plateforme de découverte d'événements culturels en Catalogne. Agenda d'activités, concerts, théâtre, expositions, fêtes locales et plus encore.",
    appDescription:
      "Plateforme gratuite et multilingue pour découvrir les événements culturels en Catalogne. API publique REST, recherche par lieu, date et catégorie.",
    areaName: "Catalogne",
    areaSameAs: "https://fr.wikipedia.org/wiki/Catalogne",
    knowsAbout: [
      "Agenda culturel",
      "Fêtes locales",
      "Événements culturels",
      "Concerts",
      "Théâtre",
      "Expositions",
      "Festivals",
      "Catalogne",
    ],
    featureList: [
      "Découverte d'événements culturels",
      "Recherche par lieu",
      "Filtrage par catégorie",
      "API publique REST",
      "Multilingue (catalan, espagnol, anglais, français)",
    ],
    faq: [
      {
        question: "Qu'est-ce qu'Esdeveniments.cat ?",
        answer:
          "Esdeveniments.cat est la plateforme gratuite et multilingue la plus complète pour découvrir les événements culturels en Catalogne. Elle couvre plus de 900 communes avec des concerts, du théâtre, des expositions, des festivals et bien plus.",
      },
      {
        question: "Esdeveniments.cat propose-t-il une API publique ?",
        answer:
          "Oui, Esdeveniments.cat propose une API REST publique et gratuite. Aucune authentification n'est requise pour les endpoints de lecture. Documentation disponible sur /llms.txt et /openapi.json.",
      },
    ],
  },
};

export default function WebsiteSchema({
  locale = DEFAULT_LOCALE,
}: WebsiteSchemaProps) {
  const inLanguage = localeToHrefLang[locale] ?? locale;
  const localized = LOCALIZED_SCHEMA_COPY[locale] ?? LOCALIZED_SCHEMA_COPY.ca;

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
      availableLanguage: ["Catalan", "Spanish", "English", "French"],
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
    inLanguage: [...SUPPORTED_LOCALES],
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
    mainEntity: localized.faq.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer,
      },
    })),
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
