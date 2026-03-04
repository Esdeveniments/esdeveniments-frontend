import { Fragment } from "react";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import type { NewsBreadcrumbProps } from "types/props";

export default function NewsBreadcrumb({ items }: NewsBreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-6 w-full px-2 lg:px-0 body-small text-foreground-strong/70"
    >
      <ol className="flex items-center space-x-2 flex-wrap">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <Fragment key={index}>
              {index > 0 && (
                <li>
                  <span className="mx-1" aria-hidden="true">
                    /
                  </span>
                </li>
              )}
              <li
                className={
                  isLast
                    ? "text-foreground-strong font-medium truncate max-w-[200px] sm:max-w-none"
                    : undefined
                }
                aria-current={isLast ? "page" : undefined}
              >
                {item.href ? (
                  <PressableAnchor
                    href={item.href}
                    className="hover:underline hover:text-primary transition-colors"
                    variant="inline"
                    prefetch={false}
                  >
                    {item.label}
                  </PressableAnchor>
                ) : (
                  item.label
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
