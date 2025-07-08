"use client";

import { useEffect } from "react";
import { getVersionedUrl } from "../../utils/buildVersion";

export default function CriticalCSS() {
  useEffect(() => {
    // Get versioned CSS URL
    const cssUrl = getVersionedUrl("/styles/non-critical.css");

    // Check if CSS is already loaded (check for any version)
    if (document.querySelector('link[href^="/styles/non-critical.css"]')) {
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
    loadCSS(cssUrl);
  }, []);

  return null;
}
