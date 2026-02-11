import { getTranslations } from "next-intl/server";
import { getLocaleSafely } from "@utils/i18n-seo";
import { contactEmail, siteUrl } from "@config/index";
import type { NextPage } from "next";
import { buildPageMeta } from "@components/partials/seo-meta";
import JsonLdServer from "@components/partials/JsonLdServer";

export async function generateMetadata() {
  const locale = await getLocaleSafely();
  const t = await getTranslations({
    locale,
    namespace: "App.PrivacyPolicy",
  });
  return buildPageMeta({
    title: t("metaTitle"),
    description: t("metaDescription"),
    canonical: `${siteUrl}/politica-privacitat`,
    locale,
  });
}

const PoliticaPrivacitat: NextPage = async () => {
  const locale = await getLocaleSafely();
  const t = await getTranslations({
    locale,
    namespace: "App.PrivacyPolicy",
  });

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: t("heading"),
    url: `${siteUrl}/politica-privacitat`,
    description: t("metaDescription"),
    isPartOf: { "@id": `${siteUrl}#website` },
  };

  return (
    <>
      <JsonLdServer id="privacy-page-schema" data={webPageSchema} />
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

            <section className="stack gap-3">
              <h2 className="heading-3">{t("dataCollectedTitle")}</h2>
              <p className="body-normal text-foreground/80">
                {t("dataCollectedBody")}
              </p>
              <ul className="stack gap-2 list-disc pl-6">
                <li className="body-normal text-foreground/80">
                  {t("dataAnalytics")}
                </li>
                <li className="body-normal text-foreground/80">
                  {t("dataCookies")}
                </li>
                <li className="body-normal text-foreground/80">
                  {t("dataVisitor")}
                </li>
                <li className="body-normal text-foreground/80">
                  {t("dataEvents")}
                </li>
              </ul>
            </section>

            <section className="stack gap-3">
              <h2 className="heading-3">{t("purposeTitle")}</h2>
              <p className="body-normal text-foreground/80">
                {t("purposeBody")}
              </p>
              <ul className="stack gap-2 list-disc pl-6">
                <li className="body-normal text-foreground/80">
                  {t("purposeImprove")}
                </li>
                <li className="body-normal text-foreground/80">
                  {t("purposeAnalytics")}
                </li>
                <li className="body-normal text-foreground/80">
                  {t("purposeDisplay")}
                </li>
                <li className="body-normal text-foreground/80">
                  {t("purposeAds")}
                </li>
              </ul>
            </section>

            <section className="stack gap-3">
              <h2 className="heading-3">{t("thirdPartyTitle")}</h2>
              <p className="body-normal text-foreground/80">
                {t("thirdPartyBody")}
              </p>
              <ul className="stack gap-2 list-disc pl-6">
                <li className="body-normal text-foreground/80">
                  {t("thirdPartyGA")}
                </li>
                <li className="body-normal text-foreground/80">
                  {t("thirdPartyAds")}
                </li>
                <li className="body-normal text-foreground/80">
                  {t("thirdPartySentry")}
                </li>
              </ul>
              <p className="body-small text-foreground/60">
                {t("thirdPartyNote")}
              </p>
            </section>

            <section className="stack gap-2">
              <h2 className="heading-3">{t("cookiesTitle")}</h2>
              <p className="body-normal text-foreground/80">
                {t("cookiesBody")}
              </p>
            </section>

            <section className="stack gap-2">
              <h2 className="heading-3">{t("retentionTitle")}</h2>
              <p className="body-normal text-foreground/80">
                {t("retentionBody")}
              </p>
            </section>

            <section className="stack gap-3">
              <h2 className="heading-3">{t("rightsTitle")}</h2>
              <p className="body-normal text-foreground/80">
                {t("rightsBody")}
              </p>
              <ul className="stack gap-2 list-disc pl-6">
                <li className="body-normal text-foreground/80">
                  {t("rightsAccess")}
                </li>
                <li className="body-normal text-foreground/80">
                  {t("rightsRectify")}
                </li>
                <li className="body-normal text-foreground/80">
                  {t("rightsDelete")}
                </li>
                <li className="body-normal text-foreground/80">
                  {t("rightsPortability")}
                </li>
                <li className="body-normal text-foreground/80">
                  {t("rightsObject")}
                </li>
              </ul>
            </section>

            <section className="stack gap-2">
              <h2 className="heading-3">{t("securityTitle")}</h2>
              <p className="body-normal text-foreground/80">
                {t("securityBody")}
              </p>
            </section>

            <section className="stack gap-2">
              <h2 className="heading-3">{t("changesTitle")}</h2>
              <p className="body-normal text-foreground/80">
                {t("changesBody")}
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

export default PoliticaPrivacitat;
