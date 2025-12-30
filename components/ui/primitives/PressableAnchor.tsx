import clsx from "clsx";
import { getLocale } from "next-intl/server";
import Link from "next/link";

import type { PressableAnchorProps, PressableLinkVariant } from "types/ui";
import { DEFAULT_LOCALE } from "types/i18n";

const VARIANT_CLASSES: Record<PressableLinkVariant, string> = {
  inline: "pressable-inline",
  card: "pressable-card transition-card",
  chip: "pressable-chip transition-interactive",
  plain: "",
};

export default async function PressableAnchor({
  className = "",
  children,
  variant = "inline",
  prefetch = false,
  disableNavigationSignal = false,
  ...props
}: PressableAnchorProps) {
  const locale = (await getLocale()) || DEFAULT_LOCALE;
  const prefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
  const withLocale = (path: string) => {
    if (!path.startsWith("/")) return path;
    if (!prefix) return path;
    if (path === "/") return prefix || "/";
    if (path.startsWith(prefix)) return path;
    return `${prefix}${path}`;
  };

  const normalizeHref = (hrefValue: PressableAnchorProps["href"]) => {
    if (typeof hrefValue === "string") {
      if (hrefValue.startsWith("http")) return hrefValue;
      return withLocale(hrefValue);
    }

    if (
      hrefValue &&
      typeof hrefValue === "object" &&
      typeof hrefValue.pathname === "string"
    ) {
      return {
        ...hrefValue,
        pathname: withLocale(hrefValue.pathname),
      };
    }

    return hrefValue;
  };

  const localizedHref = normalizeHref(props.href);
  const classes = clsx("cursor-pointer", className, VARIANT_CLASSES[variant]);
  const resolvedPrefetch =
    process.env.NODE_ENV === "test" ? undefined : prefetch;

  return (
    <Link
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
