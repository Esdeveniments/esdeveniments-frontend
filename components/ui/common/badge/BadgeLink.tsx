"use client";

import React from "react";
import { PendingLink } from "@components/ui/navigation/PendingLink";

/**
 * Client-side Badge link wrapper that provides navigation progress feedback.
 * This is a separate component to keep Badge as a server component by default.
 */
export function BadgeLink({
  href,
  className,
  ariaLabel,
  children,
}: {
  href: string;
  className: string;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <PendingLink href={href} className={className} aria-label={ariaLabel}>
      {children}
    </PendingLink>
  );
}

