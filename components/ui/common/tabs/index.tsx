import { Link } from "@i18n/routing";
import HorizontalScroll from "@components/ui/common/HorizontalScroll";
import type { TabsProps } from "types/props";

// Route-based tab strip: each item navigates to a new URL, so this is a
// <nav> of links, not an ARIA tabpanel switch. `active` is passed in by the
// page rather than derived from usePathname, which would need a client
// component and misreport under locale prefixes / prefix-matching hrefs.
export default function Tabs({ items, active, ariaLabel }: TabsProps) {
  return (
    <nav aria-label={ariaLabel} className="border-b border-border w-full">
      <HorizontalScroll ariaLabel={ariaLabel}>
        {/* HorizontalScroll's own scroller div already carries role="list";
            adding a second one here would nest a list whose only child is
            itself a list, not a listitem — a worse violation than a plain div. */}
        <div className="flex w-full">
          {items.map((item) => {
            const isActive = item.id === active;
            return (
              <div role="listitem" key={item.id} className="shrink-0">
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    // h-full + justify-end: the parent row stretches each
                    // listitem to the tallest sibling (align-items: stretch),
                    // but Link's own height is auto so it doesn't fill that
                    // stretched space by default — its content just sits at
                    // the top. h-full makes Link fill it; justify-end then
                    // pushes the label to the bottom so tabs with and without
                    // a count line still share the same label baseline.
                    "flex h-full flex-col items-center justify-end gap-1 border-b-2 -mb-px px-element-gap py-sm focus-ring",
                    isActive
                      ? "border-primary text-foreground-strong"
                      : "border-transparent text-foreground/80",
                  ].join(" ")}
                >
                  {item.count !== undefined && (
                    <span className="heading-3">{item.count}</span>
                  )}
                  <span className="body-small">{item.label}</span>
                </Link>
              </div>
            );
          })}
        </div>
      </HorizontalScroll>
    </nav>
  );
}
