import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { LocalizedPressableAnchor } from "@components/ui/primitives/PressableAnchor";
import { contactEmail, siteUrl, socialLinksSameAs } from "@config/index";
import Image from "next/image";
import type { TeamMember as TeamMemberType } from "types/common";
import {
  buildPageMeta,
  generateBreadcrumbList,
} from "@components/partials/seo-meta";
import JsonLdServer from "@components/partials/JsonLdServer";
import { requireLocale } from "@lib/i18n/require-locale";
import { toLocalizedUrl } from "@utils/i18n-seo";
import { SUPPORTED_LOCALES } from "types/i18n";

const ABOUT_PATH = "/qui-som";

export async function generateMetadata(): Promise<Metadata> {
  const locale = requireLocale(await rootLocale());
  const t = await getTranslations({ locale, namespace: "App.About" });
  return buildPageMeta({
    title: t("metaTitle"),
    description: t("metaDescription"),
    canonical: toLocalizedUrl(ABOUT_PATH, locale),
    locale,
  });
}

const teamMembers: TeamMemberType[] = [
  {
    name: "Albert Olivé Corbella",
    role: "Senior Full Stack Developer",
    title: "CTO Fundador",
    image: "/static/images/albert_olive.jpg",
    linkedin: "https://www.linkedin.com/in/albertolivecorbella/",
  },
  {
    name: "Gerard Rovellat Carbó",
    role: "Software Engineer | Backend Developer",
    title: "Co-Fundador",
    image: "/static/images/linkedin_gerard.jpg",
    linkedin: "https://www.linkedin.com/in/gerardrovellatcarbo/",
  },
];

export default async function QuiSom() {
  const locale = requireLocale(await rootLocale());
  const [t, tBreadcrumbs] = await Promise.all([
    getTranslations({ locale, namespace: "App.About" }),
    getTranslations({ locale, namespace: "Components.Breadcrumbs" }),
  ]);

  const pageUrl = toLocalizedUrl(ABOUT_PATH, locale);
  const breadcrumbSchema = generateBreadcrumbList([
    { name: tBreadcrumbs("home"), url: toLocalizedUrl("/", locale) },
    { name: t("heading"), url: pageUrl },
  ]);

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": `${pageUrl}#about`,
    url: pageUrl,
    name: t("schemaName"),
    description: t("schemaDescription"),
    isPartOf: { "@id": `${siteUrl}#website` },
    mainEntity: {
      "@type": "Organization",
      "@id": `${siteUrl}#organization`,
      name: "Esdeveniments.cat",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/static/images/logo-seo-meta.webp`,
      },
      email: contactEmail,
      address: {
        "@type": "PostalAddress",
        addressLocality: "Barcelona",
        addressRegion: "Catalunya",
        addressCountry: "ES",
      },
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "general inquiries",
          email: contactEmail,
          availableLanguage: [...SUPPORTED_LOCALES],
        },
      ],
      sameAs: socialLinksSameAs,
      member: teamMembers.map((member) => ({
        "@type": "Person",
        name: member.name,
        jobTitle: member.title,
        description: member.role,
        image: `${siteUrl}${member.image}`,
        sameAs: [member.linkedin],
      })),
    },
  };

  return (
    <>
      <JsonLdServer id="about-page-schema" data={organizationSchema} />
      {breadcrumbSchema && (
        <JsonLdServer id="about-breadcrumb-schema" data={breadcrumbSchema} />
      )}
      <div className="container py-section-y">
        <div className="max-w-3xl mx-auto stack gap-section-y-sm">
          <div className="stack gap-2 items-center text-center">
            <h1 className="heading-1">{t("heading")}</h1>
            <p className="body-large font-semibold text-primary">
              {t("subheading")}
            </p>
          </div>
          <div className="stack gap-element-gap">
            <p className="body-normal">{t("paragraph1")}</p>
            <p className="body-normal">
              {t.rich("paragraph2", {
                publish: (chunks) => (
                  <LocalizedPressableAnchor
                    locale={locale}
                    href="/publica"
                    prefetch={false}
                    className="text-primary hover:underline underline-offset-2 font-medium"
                    variant="inline"
                  >
                    {chunks}
                  </LocalizedPressableAnchor>
                ),
              })}
            </p>
            <p className="body-normal">{t("paragraph3")}</p>

            <section className="card-bordered mt-2">
              <div className="card-body stack gap-element-gap">
                <h2 className="heading-3">{t("contactHeading")}</h2>
                <p className="body-normal text-muted-foreground">
                  {t("contactBody")}
                </p>
                <a
                  href={`mailto:${contactEmail}`}
                  className="btn-primary w-fit transition-interactive"
                >
                  {t("contactCta")}
                </a>
              </div>
            </section>
          </div>
        </div>

        <section className="max-w-3xl mx-auto stack gap-section-y-sm items-center pt-section-y">
          <h2 className="heading-2 text-center">{t("teamHeading")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-lg justify-items-center">
            {teamMembers.map((member) => (
              <article
                key={member.name}
                className="card-elevated w-full max-w-60 flex flex-col overflow-hidden transition-card hover-lift"
              >
                <div className="aspect-square w-full overflow-hidden bg-muted">
                  <Image
                    className="w-full h-full object-cover object-top"
                    src={member.image}
                    alt={member.name}
                    width={240}
                    height={240}
                    sizes="240px"
                    quality={50}
                  />
                </div>
                <div className="card-body flex-1 flex flex-col gap-element-gap">
                  <div className="flex-start gap-2">
                    <span
                      aria-hidden="true"
                      className="w-1.5 h-6 bg-primary shrink-0 rounded-full"
                    />
                    <h3 className="heading-4">{member.name}</h3>
                  </div>
                  <div className="stack gap-1">
                    <p className="body-small text-muted-foreground">
                      {member.role}
                    </p>
                    <p className="body-small font-semibold text-foreground-strong">
                      {member.title}
                    </p>
                  </div>
                  <a
                    href={member.linkedin}
                    aria-label={`${t("linkedin")}: ${member.name}`}
                    className="btn-outline w-full mt-auto transition-interactive"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("linkedin")}
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
