import Link from "next/link";
import clsx from "clsx";
import type { PressableAnchorProps, PressableLinkVariant } from "types/ui";

const VARIANT_CLASSES: Record<PressableLinkVariant, string> = {
  inline: "pressable-inline",
  card: "pressable-card transition-card",
  chip: "pressable-chip transition-interactive",
  plain: "",
};

export default function PressableAnchor({
  className = "",
  children,
  variant = "inline",
  prefetch = false,
  disableNavigationSignal = false,
  ...props
}: PressableAnchorProps) {
  const classes = clsx(className, VARIANT_CLASSES[variant]);
  const resolvedPrefetch =
    process.env.NODE_ENV === "test" ? undefined : prefetch;

  return (
    <Link
      {...props}
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
