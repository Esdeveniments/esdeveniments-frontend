import { getTranslations } from "next-intl/server";
import { getLocaleSafely } from "@utils/i18n-seo";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import { contactEmail, siteUrl } from "@config/index";
import Image from "next/image";
import type { NextPage } from "next";
import type { TeamMember as TeamMemberType } from "types/common";
import { buildPageMeta } from "@components/partials/seo-meta";
import JsonLdServer from "@components/partials/JsonLdServer";
import { DEFAULT_LOCALE } from "types/i18n";

export async function generateMetadata() {
  const locale = await getLocaleSafely();
  const t = await getTranslations({ locale, namespace: "App.About" });
  return buildPageMeta({
    title: t("metaTitle"),
    description: t("metaDescription"),
    canonical: `${siteUrl}/qui-som`,
    locale,
  });
}

const teamMembers: TeamMemberType[] = [
  {
    name: "Albert Olivé Corbella",
    role: "Senior Full Stack Developer",
    title: "CTO Fundador",
    image: "/static/images/linkedin_albert.jpeg",
    linkedin: "https://www.linkedin.com/in/albertolivecorbella/",
  },
  {
    name: "Andreu Benítez Moreno",
    role: "UI Engineer | Graphic Designer",
    title: "Co-Fundador",
    image: "/static/images/linkedin_andreu.jpeg",
    linkedin: "https://www.linkedin.com/in/andreubenitezmoreno/",
  },
  {
    name: "Gerard Rovellat Carbó",
    role: "Software Engineer | Backend Developer",
    title: "Co-Fundador",
    image: "/static/images/linkedin_gerard.jpg",
    linkedin: "https://www.linkedin.com/in/gerardrovellatcarbo/",
  },
];

const QuiSom: NextPage = async () => {
  const locale = await getLocaleSafely();
  const t = await getTranslations({ locale, namespace: "App.About" });
  const prefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
  const withLocale = (path: string) => {
    if (!path.startsWith("/")) return path;
    if (!prefix) return path;
    if (path === "/") return prefix || "/";
    if (path.startsWith(prefix)) return path;
    return `${prefix}${path}`;
  };
  const absolute = (path: string) =>
    path.startsWith("http") ? path : `${siteUrl}${withLocale(path)}`;
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": `${absolute("/qui-som")}#about`,
    url: absolute("/qui-som"),
    name: t("schemaName"),
    description: t("schemaDescription"),
    isPartOf: { "@id": `${siteUrl}#website` },
    mainEntity: {
      "@type": "Organization",
      name: "Esdeveniments.cat",
      url: siteUrl,
      email: contactEmail,
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "general inquiries",
          email: contactEmail,
          availableLanguage: ["ca", "es", "en"],
        },
      ],
      sameAs: [
        "https://www.facebook.com/esdevenimentscat",
        "https://www.instagram.com/esdevenimentscat",
        "https://www.tiktok.com/@esdevenimentscat",
        "https://x.com/esdeveniments",
      ],
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
      <div className="container py-section-y">
        <div className="stack gap-6 items-center">
          <div className="stack gap-2 items-center">
            <h1 className="heading-1 text-center">{t("heading")}</h1>
            <h2 className="heading-2 text-center text-primary">{t("subheading")}</h2>
          </div>
          <div className="w-full stack gap-6">
            <p className="body-normal">{t("paragraph1")}</p>
            <p className="body-normal">
              {t.rich("paragraph2", {
                publish: (chunks) => (
                  <PressableAnchor
                    href={withLocale("/publica")}
                    prefetch={false}
                    className="text-primary hover:underline underline-offset-2 font-medium"
                    variant="inline"
                  >
                    {chunks}
                  </PressableAnchor>
                ),
              })}
            </p>
            <p className="body-normal">{t("paragraph3")}</p>

            <section className="card-bordered rounded-card">
              <div className="card-body stack gap-3">
                <h3 className="heading-3">{t("contactHeading")}</h3>
                <p className="body-normal text-foreground/80">{t("contactBody")}</p>
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
        <div className="w-full stack gap-8 items-center py-section-y">
          <h2 className="heading-2 text-center">{t("teamHeading")}</h2>
          <div className="w-full flex flex-col sm:flex-row justify-center items-center gap-8">
            {teamMembers.map((member) => (
              <article
                key={member.name}
                className="card-elevated w-[200px] h-[414px] transition-card hover-lift"
              >
                <div className="h-[185px] overflow-hidden">
                  <Image
                    className="object-cover object-top rounded-t-card"
                    src={member.image}
                    alt={member.name}
                    width={200}
                    height={200}
                  />
                </div>
                <div className="stack gap-6 items-center p-card-padding-sm">
                  <div className="flex-start gap-2 w-full pt-2">
                    <div className="w-2 h-6 bg-primary"></div>
                    <h3 className="heading-4">{member.name}</h3>
                  </div>
                  <div className="stack gap-1 w-full">
                    <p className="body-normal text-foreground">{member.role}</p>
                    <p className="body-small font-semibold text-foreground-strong">
                      {member.title}
                    </p>
                  </div>
                  <a
                    href={member.linkedin}
                    className="btn-primary w-full transition-interactive"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("linkedin")}
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default QuiSom;
