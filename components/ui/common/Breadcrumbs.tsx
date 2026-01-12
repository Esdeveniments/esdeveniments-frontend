import Link from "next/link";
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
          const isLast = index === items.length - 1;

          return (
            <li key={item.label} className="flex items-center">
              {index > 0 && (
                <ChevronRightIcon
                  className="h-3 w-3 mx-0.5 text-foreground-muted/40 flex-shrink-0"
                  aria-hidden="true"
                />
              )}
              {isLast || !item.href ? (
                <span
                  className={isLast ? "text-foreground-strong font-medium truncate max-w-[200px]" : ""}
                  aria-current={isLast ? "page" : undefined}
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
