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
  }>
>(({ href, children, className = "", onClick, ariaLabel }, ref) => {
  const combined = `${BASE_CLASS} ${className}`.trim();

  if (href) {
    return (
      <PressableAnchor
        href={href}
        className={combined}
        aria-label={ariaLabel}
        variant="chip"
        prefetch={false}
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
    >
      {children}
    </span>
  );
});

Badge.displayName = "Badge";

export default Badge;
