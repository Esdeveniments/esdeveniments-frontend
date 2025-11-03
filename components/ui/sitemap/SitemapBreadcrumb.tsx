import Link from "next/link";
import type { SitemapBreadcrumbProps } from "types/common";

/**
 * Reusable breadcrumb navigation for sitemap pages
 * Follows design system conventions for typography and colors
 */
export default function SitemapBreadcrumb({ items }: SitemapBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="w-full">
      <ol className="flex-start gap-2 body-small text-foreground/80">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.url} className="flex-start gap-2">
              {!isLast ? (
                <>
                  <Link
                    href={item.url}
                    className="hover:text-foreground transition-colors"
                  >
                    {item.name}
                  </Link>
                  <span className="text-foreground/60">/</span>
                </>
              ) : (
                <span className="text-foreground">{item.name}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
