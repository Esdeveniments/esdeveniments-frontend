import clsx from "clsx";
import Link from "next/link";

import type {
  LocalizedPressableAnchorProps,
  PressableAnchorProps,
  PressableLinkVariant,
} from "types/ui";
import type { AppLocale } from "types/i18n";
import { ensureLocale, localizePath } from "@utils/i18n-routing";
import { NO_VIGNETTE_LINK_ATTRS } from "@utils/constants";

export const PRESSABLE_LINK_VARIANT_CLASSES: Record<
  PressableLinkVariant,
  string
> = {
  inline: "pressable-inline",
  card: "pressable-card transition-card",
  chip: "pressable-chip transition-interactive",
  plain: "",
};

export function normalizeLocalizedHref(
  hrefValue: PressableAnchorProps["href"],
  locale: AppLocale,
): PressableAnchorProps["href"] {
  if (typeof hrefValue === "string") {
    return localizePath(hrefValue, locale);
  }

  if (
    hrefValue &&
    typeof hrefValue === "object" &&
    typeof hrefValue.pathname === "string"
  ) {
    return {
      ...hrefValue,
      pathname: localizePath(hrefValue.pathname, locale),
    };
  }

  return hrefValue;
}

// Sync version for callers that already know the locale. Lists use it: an
// async component per item makes React stream each one as its own segment
// with an inline `$RS` script.
export function LocalizedPressableAnchor({
  locale,
  className = "",
  children,
  variant = "inline",
  prefetch = false,
  disableNavigationSignal = false,
  ...props
}: LocalizedPressableAnchorProps) {
  const resolvedLocale = ensureLocale(locale);
  const localizedHref = normalizeLocalizedHref(props.href, resolvedLocale);
  const isInternalHref =
    typeof localizedHref !== "string" || !localizedHref.startsWith("http");
  const classes = clsx(
    "cursor-pointer",
    className,
    PRESSABLE_LINK_VARIANT_CLASSES[variant],
  );
  const resolvedPrefetch =
    process.env.NODE_ENV === "test" ? undefined : prefetch;

  return (
    <Link
      {...(isInternalHref ? NO_VIGNETTE_LINK_ATTRS : {})}
      {...props}
      href={localizedHref}
      prefetch={resolvedPrefetch}
      className={classes}
      data-pressable-link={variant}
      data-pressable-managed="false"
      data-disable-navigation-signal={
        disableNavigationSignal ? "true" : undefined
      }
    >
      {children}
    </Link>
  );
}
