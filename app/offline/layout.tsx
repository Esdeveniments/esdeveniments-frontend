import type { ReactNode } from "react";

/**
 * Layout for offline page that injects the offline.css stylesheet.
 * 
 * In Next.js 16 App Router, nested layouts cannot add <head> tags directly.
 * This uses a blocking script to inject the stylesheet synchronously before
 * React hydration to minimize FOUC. The CSS is small and critical for the
 * offline page to render correctly when offline and CSS chunks are unavailable.
 */
export default function OfflineLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var linkId = 'offline-stylesheet';
              if (!document.getElementById(linkId)) {
                var link = document.createElement('link');
                link.id = linkId;
                link.rel = 'stylesheet';
                link.href = '/static/css/offline.css';
                document.head.insertBefore(link, document.head.firstChild);
              }
            })();
          `,
        }}
      />
      {children}
    </>
  );
}

