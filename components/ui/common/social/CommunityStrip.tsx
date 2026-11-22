import type { JSX } from "react";
import { getTranslations } from "next-intl/server";
import {
  ArrowUpRightIcon,
  ChevronDownIcon,
  PlusIcon,
} from "@heroicons/react/24/solid";
import { Link } from "@i18n/routing";
import { socialLinks, socialProfiles } from "@config/index";
import { formatPlacePreposition } from "@utils/string-helpers";
import type { CommunityStripContext, CommunityStripProps } from "types/props";
import { SocialIcon } from "./icons";

const ANALYTICS_EVENT = "community_strip_click";
const BENTO_SURFACE_CLASS =
  "w-full rounded-card border border-border/60 bg-muted p-card-padding-sm flex flex-col gap-element-gap";
const TILE_CLASS =
  "group flex items-center gap-element-gap-sm min-h-button rounded-card border border-border/60 bg-background p-card-padding-sm text-foreground-strong hover:border-foreground-strong transition-colors duration-fast focus-ring no-underline";
const TILE_ARROW_CLASS =
  "ml-auto h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground-strong motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5";

const PRIMARY_PLATFORM_SET = new Set<string>(["whatsapp", "instagram"]);
const SECONDARY_PROFILES = socialProfiles.filter(
  (profile) => !PRIMARY_PLATFORM_SET.has(String(profile.platform)),
);

function renderChannelTile(
  platform: string,
  title: string,
  meta: string,
  href: string | undefined,
  context: CommunityStripContext,
  placeSlug?: string,
): JSX.Element | null {
  if (!href) return null;
  return (
    <a
      key={platform}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={TILE_CLASS}
      data-analytics-event-name={ANALYTICS_EVENT}
      data-analytics-context={context}
      data-analytics-target={platform}
      data-analytics-link-type={`social_${platform}`}
      data-analytics-place-slug={placeSlug || undefined}
    >
      <span className="flex-center h-9 w-9 shrink-0 rounded-input bg-muted text-foreground-strong">
        <SocialIcon platform={platform} className="h-4 w-4 shrink-0" />
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block body-small font-semibold text-foreground-strong truncate">
          {title}
        </span>
        <span className="block body-small text-muted-foreground truncate">
          {meta}
        </span>
      </span>
      <ArrowUpRightIcon className={TILE_ARROW_CLASS} aria-hidden="true" />
    </a>
  );
}

/**
 * Contextual inline bento strip (Server Component, zero client JS).
 * - Thin unfiltered town listings (1–4 events): invites local organizers to
 *   publish free via a single destination tile.
 * - Busy listings & event detail: neutral `bg-muted` bento with equal-weight
 *   white destination tiles for WhatsApp Channel + Instagram and a full-width
 *   native `<details>` disclosure below for the rest of the networks.
 *
 * Follows DESIGN.md › Page composition: hairline borders, no shadows, no
 * pastel gradients, and zero competing filled red buttons in follow mode.
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
        className={BENTO_SURFACE_CLASS}
        data-testid="community-strip"
        data-community-mode="thin-town"
        aria-label={thinTownTitle}
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] items-center gap-element-gap">
          <div className="stack gap-1 min-w-0">
            <span className="label text-primary">{t("thinTownEyebrow")}</span>
            <p className="heading-4 text-foreground-strong">{thinTownTitle}</p>
            <p className="body-normal text-muted-foreground">
              {t("thinTownDescription")}
            </p>
          </div>
          <Link
            href="/publica"
            prefetch={false}
            className={TILE_CLASS}
            data-analytics-event-name={ANALYTICS_EVENT}
            data-analytics-context={context}
            data-analytics-target="publish"
            data-analytics-place-slug={placeSlug || undefined}
          >
            <span className="flex-center h-9 w-9 shrink-0 rounded-input bg-primary text-primary-foreground">
              <PlusIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block body-small font-semibold text-foreground-strong truncate">
                {t("publishCta")}
              </span>
              <span className="block body-small text-muted-foreground truncate">
                {t("publishMeta")}
              </span>
            </span>
            <ArrowUpRightIcon className={TILE_ARROW_CLASS} aria-hidden="true" />
          </Link>
        </div>
      </section>
    );
  }

  const primaryChannels = [
    {
      platform: "whatsapp",
      title: t("whatsappCta"),
      meta: t("whatsappMeta"),
      href: socialLinks.whatsapp,
    },
    {
      platform: "instagram",
      title: t("instagramCta"),
      meta: t("instagramMeta"),
      href: socialLinks.instagram,
    },
  ];

  // Wide listings sit across 1024px (2-column bento); the event detail main
  // column is ~600px, so stack copy above the 2 tiles there.
  const mainLayoutClass =
    context === "event_inline"
      ? "flex flex-col gap-element-gap"
      : "grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] items-center gap-element-gap";

  return (
    <section
      className={BENTO_SURFACE_CLASS}
      data-testid="community-strip"
      data-community-mode="follow"
      aria-label={t("followTitle")}
    >
      <div className={mainLayoutClass}>
        <div className="stack gap-1 min-w-0">
          <span className="label text-primary">{t("cadenceLabel")}</span>
          <p className="heading-4 text-foreground-strong">{t("followTitle")}</p>
          <p className="body-normal text-muted-foreground">
            {t("followDescription")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-element-gap-sm">
          {primaryChannels.map(({ platform, title, meta, href }) =>
            renderChannelTile(platform, title, meta, href, context, placeSlug),
          )}
        </div>
      </div>

      <details className="details-animated group border-t border-border/50 pt-element-gap-sm">
        <summary className="inline-flex min-h-button cursor-pointer list-none items-center gap-1.5 body-small font-medium text-muted-foreground hover:text-foreground-strong transition-colors focus-ring rounded-button [&::-webkit-details-marker]:hidden">
          <span>{t("moreNetworks")}</span>
          <ChevronDownIcon
            className="h-4 w-4 shrink-0 transition-transform duration-fast group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="mt-element-gap-sm flex flex-wrap gap-element-gap-sm">
          {SECONDARY_PROFILES.map(({ platform, label, relExtra }) => {
            const href = socialLinks[platform];
            if (!href) return null;
            const rel = relExtra
              ? `${relExtra} noopener noreferrer`
              : "noopener noreferrer";
            return (
              <a
                key={String(platform)}
                href={href}
                target="_blank"
                rel={rel}
                className="btn-neutral btn-sm bg-background no-underline"
                data-analytics-event-name={ANALYTICS_EVENT}
                data-analytics-context={context}
                data-analytics-target={String(platform)}
                data-analytics-link-type={`social_${String(platform)}`}
                data-analytics-place-slug={placeSlug || undefined}
              >
                <SocialIcon
                  platform={String(platform)}
                  className="h-4 w-4 shrink-0"
                />
                <span>{label}</span>
              </a>
            );
          })}
        </div>
      </details>
    </section>
  );
}
