"use client";

import clsx from "clsx";
import Link from "next/link";
import { useLocale } from "next-intl";

import type { PressableAnchorProps, PressableLinkVariant } from "types/ui";
import { DEFAULT_LOCALE } from "types/i18n";
import { ensureLocale, localizePath } from "@utils/i18n-routing";
import { NO_VIGNETTE_LINK_ATTRS } from "@utils/constants";

const VARIANT_CLASSES: Record<PressableLinkVariant, string> = {
  inline: "pressable-inline",
  card: "pressable-card transition-card",
  chip: "pressable-chip transition-interactive",
  plain: "",
};

export default function PressableAnchorClient({
  className = "",
  children,
  variant = "inline",
  prefetch = false,
  disableNavigationSignal = false,
  ...props
}: PressableAnchorProps) {
  const resolvedLocale = ensureLocale(useLocale?.() || DEFAULT_LOCALE);

  const normalizeHref = (hrefValue: PressableAnchorProps["href"]) => {
    if (typeof hrefValue === "string") {
      return localizePath(hrefValue, resolvedLocale);
    }

    if (
      hrefValue &&
      typeof hrefValue === "object" &&
      typeof hrefValue.pathname === "string"
    ) {
      return {
        ...hrefValue,
        pathname: localizePath(hrefValue.pathname, resolvedLocale),
      };
    }

    return hrefValue;
  };

  const localizedHref = normalizeHref(props.href);
  const isInternalHref =
    typeof localizedHref !== "string" || !localizedHref.startsWith("http");
  const classes = clsx("cursor-pointer", className, VARIANT_CLASSES[variant]);
  const resolvedPrefetch =
    process.env.NODE_ENV === "test" ? undefined : prefetch;

  return (
    <Link
      {...(isInternalHref ? NO_VIGNETTE_LINK_ATTRS : {})}
      {...props}
      href={localizedHref as any}
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

