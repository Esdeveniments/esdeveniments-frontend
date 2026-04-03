import { getTranslations, setRequestLocale } from "next-intl/server";
import { Metadata } from "next";
import { Link } from "@i18n/routing";
import PricingSectionClient from "@components/ui/sponsor/PricingSectionClient";
import JsonLdServer from "@components/partials/JsonLdServer";
import {
  UserGroupIcon,
  CurrencyEuroIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { getLocaleSafely, toLocalizedUrl } from "@utils/i18n-seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocaleSafely();
  setRequestLocale(locale);
  const t = await getTranslations("Sponsorship");

  return {
    title: t("meta.title"),
    description: t("meta.description"),
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function PatrocinaPage() {
  const locale = await getLocaleSafely();
  setRequestLocale(locale);

  const t = await getTranslations("Sponsorship");
  const tComponents = await getTranslations("Components");

  const steps = ["step1", "step2", "step3", "step4"] as const;
  const faqs = ["faq1", "faq2", "faq3", "faq4"] as const;

  // Build FAQPage JSON-LD schema for rich snippets
  const faqPageSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: t(`faq.items.${faq}.question`),
      acceptedAnswer: {
        "@type": "Answer",
        text: t(`faq.items.${faq}.answer`),
      },
    })),
  };

  // WebPage schema with breadcrumbs
  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: t("meta.title"),
    description: t("meta.description"),
    url: toLocalizedUrl("/patrocina", locale),
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: tComponents("Breadcrumbs.home"),
          item: toLocalizedUrl("/", locale),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: t("meta.title"),
          item: toLocalizedUrl("/patrocina", locale),
        },
      ],
    },
  };

  return (
    <main className="min-h-screen bg-background">
      {/* JSON-LD Structured Data */}
      <JsonLdServer id="faq-schema" data={faqPageSchema} />
      <JsonLdServer id="webpage-schema" data={webPageSchema} />
      {/* Hero Section */}
      <section className="py-section-y px-section-x bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="heading-1 mb-6">{t("hero.title")}</h1>
          <p className="body-large text-foreground/80 mb-8 max-w-2xl mx-auto">
            {t("hero.subtitle")}
          </p>
          <p className="body-normal text-foreground/60 mb-8">
            {t("hero.stats")}
          </p>
          <a
            href="#pricing"
            className="btn-primary inline-block"
          >
            {t("hero.cta")}
          </a>
        </div>
      </section>

      {/* Benefits Section */}
      <section data-testid="benefits-section" className="py-section-y px-section-x">
        <div className="max-w-5xl mx-auto">
          <h2 className="heading-2 text-center mb-12">{t("benefits.title")}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card-bordered card-body text-center">
              <div className="flex justify-center mb-4">
                <UserGroupIcon className="h-12 w-12 text-primary" />
              </div>
              <h3 className="heading-4 mb-2">{t("benefits.targeted.title")}</h3>
              <p className="body-small text-foreground/70">
                {t("benefits.targeted.description")}
              </p>
            </div>
            <div className="card-bordered card-body text-center">
              <div className="flex justify-center mb-4">
                <CurrencyEuroIcon className="h-12 w-12 text-primary" />
              </div>
              <h3 className="heading-4 mb-2">{t("benefits.affordable.title")}</h3>
              <p className="body-small text-foreground/70">
                {t("benefits.affordable.description")}
              </p>
            </div>
            <div className="card-bordered card-body text-center">
              <div className="flex justify-center mb-4">
                <ChartBarIcon className="h-12 w-12 text-primary" />
              </div>
              <h3 className="heading-4 mb-2">{t("benefits.visibility.title")}</h3>
              <p className="body-small text-foreground/70">
                {t("benefits.visibility.description")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-section-y px-section-x bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="heading-2 text-center mb-4">{t("pricing.title")}</h2>
          <p className="body-normal text-foreground/70 text-center mb-12 max-w-2xl mx-auto">
            {t("pricing.subtitle")}
          </p>

          <PricingSectionClient />
        </div>
      </section>

      {/* How It Works Section */}
      <section data-testid="how-it-works-section" className="py-section-y px-section-x">
        <div className="max-w-4xl mx-auto">
          <h2 className="heading-2 text-center mb-12">{t("howItWorks.title")}</h2>
          <div className="space-y-8">
            {steps.map((step, index) => (
              <div key={step} className="flex gap-6 items-start">
                <div
                  data-testid={`step-indicator-${index + 1}`}
                  className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex-center font-bold"
                >
                  {index + 1}
                </div>
                <div>
                  <h3 className="heading-4 mb-1">
                    {t(`howItWorks.steps.${step}.title`)}
                  </h3>
                  <p className="body-normal text-foreground/70">
                    {t(`howItWorks.steps.${step}.description`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section data-testid="faq-section" className="py-section-y px-section-x bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="heading-2 text-center mb-12">{t("faq.title")}</h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <details
                key={faq}
                className="card-bordered card-body group"
              >
                <summary className="heading-4 cursor-pointer list-none flex justify-between items-center">
                  {t(`faq.items.${faq}.question`)}
                  <span className="text-foreground/50 group-open:rotate-180 transition-transform">
                    ▼
                  </span>
                </summary>
                <p className="body-normal text-foreground/70 mt-4">
                  {t(`faq.items.${faq}.answer`)}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-section-y px-section-x">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="heading-2 mb-4">{t("contact.title")}</h2>
          <p className="body-normal text-foreground/70 mb-6">
            {t("contact.description")}
          </p>
          <a
            href="mailto:hola@esdeveniments.cat"
            className="btn-primary inline-block"
          >
            {t("contact.cta")}
          </a>
        </div>
      </section>

      {/* Back to Home */}
      <section className="py-8 px-section-x border-t border-border">
        <div className="max-w-5xl mx-auto text-center">
          <Link href="/" className="text-primary hover:underline">
            ← {t("backToHome")}
          </Link>
        </div>
      </section>
    </main>
  );
}
