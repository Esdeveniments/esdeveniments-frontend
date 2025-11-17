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

  const classes = clsx(className, VARIANT_CLASSES[variant]);

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
      prefetch={resolvedPrefetch}
      className={classes}
      onClick={handleClick}
      target={target}
      data-pressed={isPressed ? "true" : undefined}
      {...handlers}
    >
      {children}
    </Link>
  );
}
