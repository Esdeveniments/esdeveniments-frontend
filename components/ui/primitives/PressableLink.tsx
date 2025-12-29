"use client";

import type { MouseEvent, ReactNode } from "react";
import Link from "next/link";
import clsx from "clsx";
import { usePressFeedback } from "@components/hooks/usePressFeedback";
import {
  isPlainLeftClick,
  startNavigationFeedback,
} from "@lib/navigation-feedback";
import type {
  PressableLinkProps,
  PressableLinkVariant,
} from "types/ui";
import { useLocale } from "next-intl";
import { DEFAULT_LOCALE } from "types/i18n";

const VARIANT_CLASSES: Record<PressableLinkVariant, string> = {
  inline: "pressable-inline",
  card: "pressable-card transition-card",
  chip: "pressable-chip transition-interactive",
  plain: "",
};

export default function PressableLink({
  className = "",
  children,
  variant = "inline",
  disableNavigationSignal = false,
  prefetch = false,
  onClick,
  target,
  ...props
}: PressableLinkProps & { children: ReactNode }) {
  const { handlers, isPressed } = usePressFeedback();
  const isTestEnv = process.env.NODE_ENV === "test";
  const resolvedPrefetch = isTestEnv ? undefined : prefetch;
  const locale = useLocale();
  const prefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
  const withLocale = (path: string) => {
    if (!path.startsWith("/")) return path;
    if (!prefix) return path;
    if (path === "/") return prefix || "/";
    if (path.startsWith(prefix)) return path;
    return `${prefix}${path}`;
  };
  const normalizeHref = (hrefValue: PressableLinkProps["href"]) => {
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

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (disableNavigationSignal) return;
    if (target === "_blank") return;
    if (!isPlainLeftClick(event)) return;
    startNavigationFeedback();
  };

  return (
    <Link
      {...props}
      href={localizedHref as any}
      prefetch={resolvedPrefetch}
      className={classes}
      onClick={handleClick}
      target={target}
      data-pressed={isPressed ? "true" : undefined}
      data-pressable-link={variant}
      data-pressable-managed="true"
      data-disable-navigation-signal={
        disableNavigationSignal ? "true" : undefined
      }
      {...handlers}
    >
      {children}
    </Link>
  );
}
