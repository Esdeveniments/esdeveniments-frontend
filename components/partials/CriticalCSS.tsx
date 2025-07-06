"use client";

import { useEffect } from "react";

export default function CriticalCSS() {
  useEffect(() => {
    // Load non-critical CSS asynchronously
    const loadCSS = (href: string) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.media = "print"; // Load with low priority
      link.onload = () => {
        link.media = "all"; // Switch to all media once loaded
      };
      document.head.appendChild(link);
    };

    // Load non-critical styles after initial render
    loadCSS("/styles/non-critical.css");
  }, []);

  return null;
}
