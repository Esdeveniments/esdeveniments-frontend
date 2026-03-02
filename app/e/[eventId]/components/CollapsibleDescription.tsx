"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

const COLLAPSED_HEIGHT = 200; // px — approximately 200 chars worth of text

/**
 * Wraps children in a collapsible container on mobile.
 * Shows full content on desktop (lg+).
 * On mobile, truncates to ~200px height with a "Read more" / "Read less" toggle.
 */
export default function CollapsibleDescription({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("Components.EventPage");
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsCollapse, setNeedsCollapse] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    // Check if content exceeds the collapse threshold
    const checkHeight = () => {
      setNeedsCollapse(el.scrollHeight > COLLAPSED_HEIGHT + 40);
    };

    checkHeight();

    // Re-check on resize (e.g., orientation change)
    const observer = new ResizeObserver(checkHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="lg:contents">
      {/* On desktop (lg+), show full content with no collapse */}
      <div className="hidden lg:block">{children}</div>

      {/* On mobile/tablet, show collapsible version */}
      <div className="lg:hidden">
        <div
          ref={contentRef}
          className="relative overflow-hidden transition-[max-height] duration-300 ease-in-out"
          style={{
            maxHeight:
              !needsCollapse || isExpanded
                ? "none"
                : `${COLLAPSED_HEIGHT}px`,
          }}
        >
          {children}
          {/* Fade gradient when collapsed */}
          {needsCollapse && !isExpanded && (
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none" />
          )}
        </div>
        {needsCollapse && (
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="mt-2 inline-flex items-center gap-1 body-small font-semibold text-primary hover:text-primary-dark transition-colors px-section-x"
            type="button"
            aria-expanded={isExpanded}
          >
            {isExpanded ? (
              <>
                {t("readLess")}
                <ChevronUpIcon className="w-4 h-4" />
              </>
            ) : (
              <>
                {t("readMore")}
                <ChevronDownIcon className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
