"use client";

import { useEffect, useState } from "react";

/**
 * Detect whether the site navbar is currently visible in the viewport.
 * Robust across mobile browser UI hide/show since it observes the element,
 * not the window scroll position.
 */
export function useNavbarVisible(navbarId: string = "site-navbar"): boolean {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const el = document.getElementById(navbarId);
    if (!el) {
      // If navbar is not found, assume it's visible to keep safe offsets.
      setVisible(true);
      return;
    }

    // Prefer IntersectionObserver when available
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          setVisible(entry?.isIntersecting ?? true);
        },
        {
          root: null,
          threshold: 0,
        }
      );

      observer.observe(el);
      return () => observer.disconnect();
    }

    // Fallback using scroll listener
    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      setVisible(rect.bottom > 0);
    };

    onScroll();
    // In some TS environments, `window` may be incorrectly typed.
    // Use direct cast to avoid type narrowing issues.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    w.addEventListener("scroll", onScroll, { passive: true });
    return () => w.removeEventListener("scroll", onScroll);
  }, [navbarId]);

  return visible;
}
