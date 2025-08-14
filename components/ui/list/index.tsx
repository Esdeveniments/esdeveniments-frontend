import { memo, JSX, useRef, useEffect, useState } from "react";
import type { ListProps } from "types/common";
import { useVirtualizer } from "@tanstack/react-virtual";

function List({ events, children }: ListProps): JSX.Element {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [scrollElement, setScrollElement] = useState<Element | null>(null);

  // Use window scrolling when available to avoid nested scrollbars
  useEffect(() => {
    setScrollElement(
      typeof window !== "undefined" ? document.scrollingElement : null
    );
  }, []);

  // Use virtualization for larger lists only
  const shouldVirtualize = (events?.length || 0) > 24;

  const rowVirtualizer = useVirtualizer({
    count: events?.length || 0,
    getScrollElement: () => (shouldVirtualize ? scrollElement : null),
    estimateSize: () => 360, // Approximate card height including margins
    overscan: 6,
    enabled: shouldVirtualize,
  });

  if (!shouldVirtualize) {
    return (
      <section className="flex flex-col justify-center items-center">
        {events?.map((event, index) => children(event, index))}
      </section>
    );
  }

  const totalSize = rowVirtualizer.getTotalSize();
  const items = rowVirtualizer.getVirtualItems();

  return (
    <div ref={parentRef} className="w-full max-w-full">
      <div
        style={{
          height: totalSize,
          position: "relative",
          width: "100%",
        }}
      >
        {items.map((virtualRow) => {
          const index = virtualRow.index;
          const event = events[index];
          return (
            <div
              key={event.id}
              data-index={index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {children(event, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(List);
