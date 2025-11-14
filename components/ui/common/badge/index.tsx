import React, { forwardRef } from "react";
import Link from "next/link";
import { BadgeLink } from "./BadgeLink";

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
    usePendingLink?: boolean; // Opt-in to navigation progress feedback
  }>
>(({ href, children, className = "", onClick, ariaLabel, usePendingLink = false }, ref) => {
  const combined = `${BASE_CLASS} ${className}`.trim();

  if (href) {
    // Use PendingLink only when explicitly requested (for navigation feedback)
    if (usePendingLink) {
      return (
        <BadgeLink href={href} className={combined} aria-label={ariaLabel}>
          <span data-slot="badge" ref={ref}>
            {children}
          </span>
        </BadgeLink>
      );
    }
    // Default: use regular Link for server-side rendering (better SEO/performance)
    return (
      <Link href={href} className={combined} aria-label={ariaLabel}>
        <span data-slot="badge" ref={ref}>
          {children}
        </span>
      </Link>
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
