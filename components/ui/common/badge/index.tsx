import React, { forwardRef } from "react";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";

// Base classes aligned with design tokens (badge sizing + transitions)
const BASE_CLASS =
  "rounded-badge px-badge-x py-badge-y text-xs font-medium border border-border hover:bg-muted transition-interactive cursor-pointer";

const Badge = forwardRef<
  HTMLSpanElement,
  React.PropsWithChildren<{
    href?: string;
    className?: string;
    variant?: "outline" | "solid";
    onClick?: () => void;
    ariaLabel?: string;
    [key: `data-${string}`]: string | undefined;
  }>
>(({ href, children, className = "", onClick, ariaLabel, ...rest }, ref) => {
  const combined = `${BASE_CLASS} ${className}`.trim();

  // Separate data-* attributes to forward to the underlying element
  const dataAttrs = Object.fromEntries(
    Object.entries(rest).filter(([k]) => k.startsWith("data-")),
  );

  if (href) {
    return (
      <PressableAnchor
        href={href}
        className={combined}
        aria-label={ariaLabel}
        variant="chip"
        prefetch={false}
        {...dataAttrs}
      >
        <span data-slot="badge" ref={ref}>
          {children}
        </span>
      </PressableAnchor>
    );
  }

  return (
    <span
      data-slot="badge"
      ref={ref}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      aria-label={ariaLabel}
      className={combined}
      {...dataAttrs}
    >
      {children}
    </span>
  );
});

Badge.displayName = "Badge";

export default Badge;
