  import type { SitemapLayoutProps } from "types/common";

/**
 * Shared layout wrapper for sitemap pages
 * Provides consistent container, spacing, and semantic structure
 */
export default function SitemapLayout({
  children,
  testId,
}: SitemapLayoutProps) {
  return (
    <div className="container py-section-y" role="main" data-testid={testId}>
      <div className="stack gap-6 w-full">{children}</div>
    </div>
  );
}
