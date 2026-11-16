import { getTranslations } from "next-intl/server";
import { siteUrl, socialLinksSameAs } from "@config/index";
import { ensureLocale } from "@utils/i18n-routing";
import {
  DEFAULT_LOCALE,
  LOCALE_NAMES,
  SUPPORTED_LOCALES,
  localeToHrefLang,
} from "types/i18n";
import type { WebsiteSchemaProps } from "types/props";
import localeLists from "../../i18n/locale-lists.json";
import JsonLdServer from "./JsonLdServer";

export default async function WebsiteSchema({
  locale = DEFAULT_LOCALE,
}: WebsiteSchemaProps) {
  const resolvedLocale = ensureLocale(locale);
  const t = await getTranslations({
    locale: resolvedLocale,
    namespace: "Partials.WebsiteSchema",
  });
  const inLanguage = localeToHrefLang[resolvedLocale] ?? resolvedLocale;
  const schemaLists =
    localeLists.websiteSchema[resolvedLocale] ??
    localeLists.websiteSchema[DEFAULT_LOCALE];

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}#website`,
    name: "Esdeveniments.cat",
    alternateName: "Esdeveniments Catalunya",
    url: siteUrl,
    description: t("siteDescription"),
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
    description: t("orgDescription"),
    foundingDate: "2020",
    areaServed: {
      "@type": "AdministrativeArea",
      name: t("areaName"),
      sameAs: t("areaSameAs"),
    },
    knowsAbout: schemaLists.knowsAbout,
    sameAs: socialLinksSameAs,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "info@esdeveniments.cat",
      availableLanguage: Object.values(LOCALE_NAMES),
    },
  };

  const webAppSchema = {
    "@context": "https://schema.org",
    "@type": ["WebApplication", "SoftwareApplication"],
    "@id": `${siteUrl}#webapp`,
    name: "Esdeveniments.cat",
    alternateName: "Què Fer a Catalunya",
    description: t("appDescription"),
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
    featureList: schemaLists.featureList,
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

  const faqItems = [
    { question: t("faqWhatQuestion"), answer: t("faqWhatAnswer") },
    { question: t("faqApiQuestion"), answer: t("faqApiAnswer") },
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map(({ question, answer }) => ({
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
