"use client";

import type { MouseEvent, ReactNode } from "react";
import Link from "next/link";
import clsx from "clsx";
import { usePressFeedback } from "@components/hooks/usePressFeedback";
import {
  isPlainLeftClick,
  startNavigationFeedback,
} from "@lib/navigation-feedback";
import type { PressableLinkProps } from "types/ui";
import { useLocale } from "next-intl";
import { DEFAULT_LOCALE } from "types/i18n";
import { ensureLocale } from "@utils/i18n-routing";
import { NO_VIGNETTE_LINK_ATTRS } from "@utils/constants";
import {
  PRESSABLE_LINK_VARIANT_CLASSES,
  normalizeLocalizedHref,
} from "./LocalizedPressableAnchor";

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
  const resolvedPrefetch =
    process.env.NODE_ENV === "test" ? undefined : prefetch;
  const locale = ensureLocale(useLocale?.() || DEFAULT_LOCALE);
  const localizedHref = normalizeLocalizedHref(props.href, locale);
  const isInternalHref =
    typeof localizedHref !== "string" || !localizedHref.startsWith("http");

  const classes = clsx(
    "cursor-pointer",
    className,
    PRESSABLE_LINK_VARIANT_CLASSES[variant],
  );

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
      {...(isInternalHref ? NO_VIGNETTE_LINK_ATTRS : {})}
      {...props}
      href={localizedHref}
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
