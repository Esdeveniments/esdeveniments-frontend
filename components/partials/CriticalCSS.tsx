"use client";

import { useEffect } from "react";

export default function CriticalCSS() {
  useEffect(() => {
    // Check if CSS is already loaded
    if (document.querySelector('link[href="/styles/non-critical.css"]')) {
      return;
    }

    // Load non-critical CSS asynchronously
    const loadCSS = (href: string) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.media = "print"; // Load with low priority
      link.onload = () => {
        link.media = "all"; // Switch to all media once loaded
      };
      link.onerror = () => {
        console.warn(`Failed to load CSS: ${href}`);
      };
      document.head.appendChild(link);
      return link;
    };

    // Load non-critical styles after initial render
    loadCSS("/styles/non-critical.css");
  }, []);

  return null;
}
