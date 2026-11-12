"use client";

import { useId, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import type { CollapsibleDescriptionProps } from "types/props";

/**
 * Renders the description once. When the server says it is long, it starts
 * clamped on mobile (the same height in the HTML and after hydration, so no
 * layout shift) with a "Read more" toggle; desktop always shows it all.
 */
export default function CollapsibleDescription({
  collapsible,
  children,
}: CollapsibleDescriptionProps) {
  const t = useTranslations("Components.EventPage");
  const [expanded, setExpanded] = useState(false);
  const regionId = useId();

  if (!collapsible) return <>{children}</>;

  return (
    <div>
      <div
        id={regionId}
        className={`relative ${expanded ? "" : "max-h-52 overflow-hidden lg:max-h-none lg:overflow-visible"}`}
      >
        {children}
        {!expanded && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent lg:hidden"
          />
        )}
      </div>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="mt-2 inline-flex min-h-button items-center gap-1 body-small font-semibold text-foreground-strong hover:underline transition-interactive lg:hidden"
        aria-expanded={expanded}
        aria-controls={regionId}
      >
        {expanded ? t("readLess") : t("readMore")}
        <ChevronDownIcon
          className={`h-4 w-4 transition-interactive ${expanded ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
