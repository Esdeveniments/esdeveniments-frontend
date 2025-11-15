"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useNavigationProgressStore } from "./useNavigationProgress";

/**
 * Global navigation listener that intercepts all Link clicks
 * and shows navigation progress. This eliminates the need for
 * PendingLink on every link - regular Links will work fine.
 */
export function useGlobalNavigation() {
  const pathname = usePathname();
  const { start, done } = useNavigationProgressStore();
  const prevPathnameRef = useRef(pathname);

  // Intercept all Link clicks using event delegation
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Find the closest anchor tag (could be the target or a parent)
      const link = target.closest("a[href]") as HTMLAnchorElement;
      
      if (!link) return;

      const href = link.getAttribute("href");
      if (!href) return;

      // Skip external links, anchors, and special protocols
      if (
        href.startsWith("http") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("#") ||
        link.target === "_blank"
      ) {
        return;
      }

      // Skip if clicking the same page
      const currentPath = window.location.pathname + window.location.search;
      if (href === currentPath || href === pathname) {
        return;
      }

      // Start navigation progress
      start();
    };

    // Listen for clicks on the document (event delegation)
    document.addEventListener("click", handleLinkClick, true);

    return () => {
      document.removeEventListener("click", handleLinkClick, true);
    };
  }, [pathname, start]);

  // Detect navigation completion via pathname change
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      done();
    }
  }, [pathname, done]);
}

