import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getLocaleSafely, toLocalizedUrl } from "@utils/i18n-seo";
import { contactEmail, siteUrl } from "@config/index";
import type { NextPage } from "next";
import { buildPageMeta } from "@components/partials/seo-meta";
import JsonLdServer from "@components/partials/JsonLdServer";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocaleSafely();
  const t = await getTranslations({ locale, namespace: "App.TermsOfService" });
  return buildPageMeta({
    title: t("metaTitle"),
    description: t("metaDescription"),
    canonical: toLocalizedUrl("/termes-servei", locale),
    locale,
    robotsOverride: "noindex, follow",
  });
}

const TermesServei: NextPage = async () => {
  const locale = await getLocaleSafely();
  const t = await getTranslations({
    locale,
    namespace: "App.TermsOfService",
  });

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: t("heading"),
    url: toLocalizedUrl("/termes-servei", locale),
    description: t("metaDescription"),
    isPartOf: { "@id": `${siteUrl}#website` },
  };

  return (
    <>
      <JsonLdServer id="terms-page-schema" data={webPageSchema} />
      <div className="container py-section-y">
        <div className="stack gap-6 max-w-3xl mx-auto">
          <div className="stack gap-2">
            <h1 className="heading-1">{t("heading")}</h1>
            <p className="body-small text-foreground/60">{t("lastUpdated")}</p>
          </div>

          <div className="stack gap-8">
            <section className="stack gap-2">
              <h2 className="heading-3">{t("introTitle")}</h2>
              <p className="body-normal text-foreground/80">
                {t("introBody")}
              </p>
            </section>

            <section className="stack gap-2">
              <h2 className="heading-3">{t("descriptionTitle")}</h2>
              <p className="body-normal text-foreground/80">
                {t("descriptionBody")}
              </p>
            </section>

            <section className="stack gap-2">
              <h2 className="heading-3">{t("userContentTitle")}</h2>
              <p className="body-normal text-foreground/80">
                {t("userContentBody")}
              </p>
            </section>

            <section className="stack gap-2">
              <h2 className="heading-3">{t("intellectualPropertyTitle")}</h2>
              <p className="body-normal text-foreground/80">
                {t("intellectualPropertyBody")}
              </p>
            </section>

            <section className="stack gap-2">
              <h2 className="heading-3">{t("disclaimerTitle")}</h2>
              <p className="body-normal text-foreground/80">
                {t("disclaimerBody")}
              </p>
            </section>

            <section className="stack gap-2">
              <h2 className="heading-3">{t("thirdPartyTitle")}</h2>
              <p className="body-normal text-foreground/80">
                {t("thirdPartyBody")}
              </p>
            </section>

            <section className="stack gap-2">
              <h2 className="heading-3">{t("modificationsTitle")}</h2>
              <p className="body-normal text-foreground/80">
                {t("modificationsBody")}
              </p>
            </section>

            <section className="stack gap-3">
              <h2 className="heading-3">{t("contactTitle")}</h2>
              <p className="body-normal text-foreground/80">
                {t("contactBody")}
              </p>
              <a
                href={`mailto:${contactEmail}`}
                className="btn-primary w-fit transition-interactive"
              >
                {contactEmail}
              </a>
            </section>
          </div>
        </div>
      </div>
    </>
  );
};

export default TermesServei;
