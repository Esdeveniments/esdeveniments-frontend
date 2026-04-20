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
    },
    es: {
      siteDescription: "Descubre eventos culturales en Cataluña",
      orgDescription:
        "Plataforma de descubrimiento de eventos culturales en Cataluña. Agenda de actividades, conciertos, teatro, exposiciones y más.",
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
    },
    en: {
      siteDescription: "Discover cultural events in Catalonia",
      orgDescription:
        "Cultural events discovery platform for Catalonia. Browse concerts, theatre, exhibitions, festivals, and more.",
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
    },
  }[locale] ?? {
    siteDescription: "Descobreix esdeveniments culturals a Catalunya",
    orgDescription:
      "Plataforma de descobriment d'esdeveniments culturals a Catalunya.",
    areaName: "Catalunya",
    areaSameAs: "https://ca.wikipedia.org/wiki/Catalunya",
    knowsAbout: ["Esdeveniments culturals", "Catalunya"],
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
    publisher: {
      "@type": "Organization",
      "@id": `${siteUrl}#organization`,
      name: "Esdeveniments.cat",
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
    },
  };

  return <JsonLdServer id="website-schema" data={websiteSchema} />;
}
