import type { JSX } from "react";
import { getTranslations } from "next-intl/server";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import { Link } from "@i18n/routing";
import { socialLinks, socialProfiles } from "@config/index";
import { formatPlacePreposition } from "@utils/string-helpers";
import type { CommunityStripContext, CommunityStripProps } from "types/props";
import { SocialIcon } from "./icons";

const ANALYTICS_EVENT = "community_strip_click";
const CARD_SURFACE_CLASS =
  "w-full rounded-card border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background p-card-padding-sm";
const WHATSAPP_CTA_CLASS =
  "btn-base btn-sm border-transparent bg-success-dark text-primary-foreground hover:bg-success-dark/90 focus-visible:ring-success-dark";

const PRIMARY_PLATFORM_SET = new Set<string>(["whatsapp", "instagram"]);
const SECONDARY_PROFILES = socialProfiles.filter(
  (profile) => !PRIMARY_PLATFORM_SET.has(String(profile.platform)),
);

function renderNetworkLink(
  platform: string,
  label: string,
  href: string | undefined,
  buttonClass: string,
  context: CommunityStripContext,
  placeSlug?: string,
  relExtra?: string,
): JSX.Element | null {
  if (!href) return null;
  const rel = relExtra
    ? `${relExtra} noopener noreferrer`
    : "noopener noreferrer";

  return (
    <a
      key={platform}
      href={href}
      target="_blank"
      rel={rel}
      className={`${buttonClass} no-underline`}
      data-analytics-event-name={ANALYTICS_EVENT}
      data-analytics-context={context}
      data-analytics-target={platform}
      data-analytics-link-type={`social_${platform}`}
      data-analytics-place-slug={placeSlug || undefined}
    >
      <SocialIcon platform={platform} className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </a>
  );
}

/**
 * Contextual inline community/supply strip (Server Component, zero client JS).
 * - Thin town listings (1–4 events): invites local organizers to publish free.
 * - Busy listings & event detail: promotes WhatsApp Channel + Instagram with
 *   progressive disclosure (<details>) for the rest of the networks.
 *
 * Neutral card styling: brand red stays reserved for the page's single primary
 * action (DESIGN.md › Page composition).
 */
export default async function CommunityStrip({
  locale,
  context,
  placeSlug,
  placeLabel,
  placeType,
}: CommunityStripProps): Promise<JSX.Element> {
  const t = await getTranslations({ locale, namespace: "Components.CommunityStrip" });

  if (context === "thin_town_inline" && placeLabel) {
    const placeIn = formatPlacePreposition(
      placeLabel,
      placeType || "town",
      locale,
      false,
    );
    const thinTownTitle = t("thinTownTitle", { placeIn });
    return (
      <section
        className="w-full"
        data-testid="community-strip"
        data-community-mode="thin-town"
        aria-label={thinTownTitle}
      >
        <Link
          href="/publica"
          prefetch={false}
          className={`group flex flex-col gap-element-gap md:flex-row md:items-center md:justify-between ${CARD_SURFACE_CLASS} transition-colors hover:border-border focus-ring no-underline`}
          data-analytics-event-name={ANALYTICS_EVENT}
          data-analytics-context={context}
          data-analytics-target="publish"
          data-analytics-place-slug={placeSlug || undefined}
        >
          <span className="stack gap-1 min-w-0 flex-1">
            <span className="heading-4 text-foreground-strong">
              {thinTownTitle}
            </span>
            <span className="body-normal text-muted-foreground">
              {t("thinTownDescription")}
            </span>
          </span>
          <span className="btn-primary btn-sm self-start md:self-center shrink-0 group-hover:bg-primary-dark">
            {t("publishCta")}
            <ChevronRightIcon
              className="h-4 w-4 shrink-0 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </span>
        </Link>
      </section>
    );
  }

  const primaryActions = [
    {
      platform: "whatsapp",
      label: t("whatsappCta"),
      href: socialLinks.whatsapp,
      buttonClass: WHATSAPP_CTA_CLASS,
    },
    {
      platform: "instagram",
      label: t("instagramCta"),
      href: socialLinks.instagram,
      buttonClass: "btn-outline btn-sm",
    },
  ];

  return (
    <section
      className={CARD_SURFACE_CLASS}
      data-testid="community-strip"
      data-community-mode="follow"
      aria-label={t("followTitle")}
    >
      <div className="flex flex-col gap-element-gap">
        <div className="stack gap-1 min-w-0">
          <p className="heading-4 text-foreground-strong">{t("followTitle")}</p>
          <p className="body-normal text-muted-foreground">
            {t("followDescription")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-element-gap-sm">
          {primaryActions.map(({ platform, label, href, buttonClass }) =>
            renderNetworkLink(
              platform,
              label,
              href,
              buttonClass,
              context,
              placeSlug,
            ),
          )}
        </div>
      </div>

      <details className="details-animated group mt-element-gap border-t border-primary/15 pt-element-gap-sm">
        <summary className="flex min-h-button w-full cursor-pointer list-none items-center justify-between gap-element-gap-sm body-small font-medium text-muted-foreground hover:text-foreground transition-colors focus-ring rounded-button [&::-webkit-details-marker]:hidden">
          <span>{t("moreNetworks")}</span>
          <ChevronDownIcon
            className="h-4 w-4 shrink-0 transition-transform duration-fast group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="mt-element-gap-sm flex flex-wrap gap-element-gap-sm">
          {SECONDARY_PROFILES.map(({ platform, label, relExtra }) =>
            renderNetworkLink(
              String(platform),
              label,
              socialLinks[platform],
              "btn-muted btn-sm",
              context,
              placeSlug,
              relExtra,
            ),
          )}
        </div>
      </details>
    </section>
  );
}
