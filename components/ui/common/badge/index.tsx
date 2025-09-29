import React, { forwardRef } from "react";
import Link from "next/link";

// Base classes requested by design, adapted to use the project's color palette
const BASE_CLASS =
  "rounded-lg px-4 py-2 text-sm font-medium border-2 border-blackCorp/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 cursor-pointer hover:scale-[1.02] active:scale-[0.98]";

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
