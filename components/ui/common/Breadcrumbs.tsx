import { Link } from "@i18n/routing";
import { ChevronRightIcon } from "@heroicons/react/24/solid";
import type { BreadcrumbsProps } from "types/props";

export default function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center text-xs text-foreground-muted/70 ${className}`}
    >
      <ol className="flex items-center flex-wrap gap-0.5">
        {items.map((item, index) => {
          // Pages whose trail ends at the parent (event pages) pass a last
          // item with an href: it stays a link and isn't the current page.
          const isCurrent = index === items.length - 1 && !item.href;

          return (
            <li key={item.label} className="flex items-center">
              {index > 0 && (
                <ChevronRightIcon
                  className="h-3 w-3 mx-0.5 text-foreground-muted/40 flex-shrink-0"
                  aria-hidden="true"
                />
              )}
              {!item.href ? (
                <span
                  className={isCurrent ? "text-foreground-strong font-medium truncate max-w-[200px]" : ""}
                  aria-current={isCurrent ? "page" : undefined}
                  title={item.label}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-primary transition-colors hover:underline"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
