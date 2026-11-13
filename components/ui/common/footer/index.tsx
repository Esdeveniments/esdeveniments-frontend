import { cacheLife } from "next/cache";
import { locale as rootLocale } from "next/root-params";
import { getTranslations } from "next-intl/server";
import { JSX } from "react";
import { Link } from "@i18n/routing";
import Social from "@components/ui/common/social";
import CopyrightNotice from "./CopyrightYear";
import { buildTopAgendaLinks } from "@config/top-agenda-links";
import type { AppLocale } from "types/i18n";
import { contactEmail, socialLinks } from "@config/index";
import { FESTES_MAJORS_SEGMENT } from "@utils/constants";

// Reading the clock while rendering made the footer boundary dynamic under
// cacheComponents. The shell then dropped the <footer>, but still streamed its
// link holes, so React's $RS found no placeholders (11 errors per page).
async function getCopyrightYear(): Promise<number> {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export default async function Footer(): Promise<JSX.Element> {
  const locale = (await rootLocale()) as AppLocale;
  const [t, tSponsor, tTopAgenda] = await Promise.all([
    getTranslations({ locale, namespace: "Components.Footer" }),
    getTranslations({ locale, namespace: "Sponsor" }),
    getTranslations({ locale, namespace: "Config.TopAgenda" }),
  ]);
  const topAgendaLinks = buildTopAgendaLinks(
    (placeOf) => tTopAgenda("agendaOf", { placeOf }),
    locale
  );

  const navigation = [
    { name: t("navigation.home"), href: "/", kind: "internal", current: false },
    {
      name: t("navigation.agenda"),
      href: "/catalunya",
      kind: "internal",
      current: false,
    },
    {
      name: t("navigation.favorites"),
      href: "/preferits",
      kind: "internal",
      current: false,
    },
    {
      name: t("navigation.publish"),
      href: "/publica",
      kind: "internal",
      current: false,
    },
    { name: t("navigation.news"), href: "/noticies", kind: "internal", current: false },
    { name: t("navigation.festesMajors"), href: `/${FESTES_MAJORS_SEGMENT}`, kind: "internal", current: false },
    { name: t("navigation.about"), href: "/qui-som", kind: "internal", current: false },
    { name: t("navigation.advertise"), href: "/patrocina", kind: "internal", current: false },
    {
      name: t("navigation.contact"),
      href: `mailto:${contactEmail}`,
      kind: "mailto",
      current: false,
    },
    { name: t("navigation.developers"), href: "/developers", kind: "internal", current: false },
    { name: t("navigation.archive"), href: "/sitemap", kind: "internal", current: false },
    { name: t("navigation.terms"), href: "/termes-servei", kind: "internal", current: false },
    { name: t("navigation.privacy"), href: "/politica-privacitat", kind: "internal", current: false },
    { name: t("navigation.login"), href: "/iniciar-sessio", kind: "internal", current: false },
  ] satisfies Array<
    | {
      name: string;
      href: `/${string}`;
      kind: "internal";
      current: boolean;
    }
    | {
      name: string;
      href: `mailto:${string}`;
      kind: "mailto";
      current: boolean;
    }
  >;
  const links = socialLinks;

  return (
    <footer className="w-full border-t border-border bg-gradient-to-b from-background to-muted/30">
      <div
        className="container mobile-nav-content-safe-area flex flex-col items-center gap-section-y-sm pt-section-y px-section-x"
        data-testid="mobile-nav-content-safe-area"
      >
        {/* Social Media Section */}
        <div className="flex flex-col items-center gap-element-gap px-4 sm:px-0">
          <Social links={links} />
        </div>

        {/* Horizontal Divider */}
        <hr className="w-full max-w-4xl border-t border-border/50" />

        {/* Navigation Links Section */}
        <nav
          className="flex flex-wrap justify-center items-center gap-4 w-full max-w-full"
          aria-label="Footer navigation"
        >
          {navigation.map((item) =>
            item.kind === "mailto" ? (
              <a
                key={item.name}
                href={item.href}
                className="label font-semibold px-button-x py-button-y whitespace-nowrap hover:text-primary transition-interactive pressable-inline"
              >
                {item.name}
              </a>
            ) : (
              <Link
                href={item.href}
                key={item.name}
                prefetch={false}
                data-pressable-link="inline"
                className="label font-semibold px-button-x py-button-y whitespace-nowrap hover:text-primary transition-interactive pressable-inline"
                {...(item.href === "/iniciar-sessio"
                  ? { "data-analytics-action": "footer_login" }
                  : {})}
              >
                {item.name}
              </Link>
            )
          )}
        </nav>

        {/* Horizontal Divider */}
        <hr className="w-full max-w-4xl border-t border-border/50" />

        {/* Sponsor CTA Section */}
        <section
          className="w-full flex flex-col items-center gap-element-gap"
          aria-labelledby="footer-sponsor-cta"
        >
          <div className="card-bordered w-full max-w-4xl bg-background/60">
            <div className="card-body flex flex-col items-center gap-element-gap text-center">
              <h2 id="footer-sponsor-cta" className="heading-4 text-foreground-strong">
                {t("sponsorCta.title")}
              </h2>
              <p className="body-small text-muted-foreground max-w-2xl">
                {t("sponsorCta.description")}
              </p>
              <Link
                href="/patrocina"
                prefetch={false}
                data-pressable-link="inline"
                className="btn-primary pressable-inline"
              >
                {tSponsor("cta")}
              </Link>
            </div>
          </div>
        </section>

        {/* Horizontal Divider */}
        <hr className="w-full max-w-4xl border-t border-border/50" />

        {/* Featured Agendas Section */}
        <section
          className="w-full flex flex-col items-center gap-element-gap"
          aria-labelledby="featured-agendas"
        >
          <h2 id="featured-agendas" className="heading-4 text-foreground-strong">
            {t("featuredAgendas")}
          </h2>
          <div className="w-full max-w-5xl bg-background/50 rounded-card p-6 shadow-sm border border-border/40">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-3">
              {topAgendaLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  data-pressable-link="inline"
                  className="body-small text-foreground/80 hover:text-primary hover:underline decoration-2 underline-offset-4 transition duration-normal py-1 pressable-inline"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Horizontal Divider */}
        <hr className="w-full max-w-4xl border-t border-border/50" />

        {/* Copyright Section */}
        <div
          className="w-full flex flex-col items-center gap-element-gap-sm px-section-x"
          data-testid="footer-last-content"
        >
          <CopyrightNotice year={await getCopyrightYear()} />
          <span className="text-xs text-muted-foreground text-center">
            {t("tagline")}
          </span>
        </div>
      </div>
    </footer>
  );
}
