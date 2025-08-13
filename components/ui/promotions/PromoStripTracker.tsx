"use client";

import { useEffect, useRef } from "react";
import { sendGoogleEvent } from "@utils/analytics";
import type { EventSummaryResponseDTO } from "types/api/event";

type Props = {
  events: EventSummaryResponseDTO[];
  placement: string; // e.g., home_empreses, place_bottom, event_nearby
  pageType: string; // home | place | event | news
  place?: string;
  category?: string;
  children: React.ReactNode;
};

export default function PromoStripTracker({
  events,
  placement,
  pageType,
  place,
  category,
  children,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const impressionSentRef = useRef(false);

  useEffect(() => {
    if (!ref.current || impressionSentRef.current) return;
    const el = ref.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !impressionSentRef.current) {
          try {
            sendGoogleEvent("promoted.strip_impression", {
              placement,
              pageType,
              place,
              category,
              items: events.slice(0, 10).map((e, idx) => ({ id: e.id, slug: e.slug, position: idx + 1 })),
            });
          } catch (_) {}
          impressionSentRef.current = true;
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [placement, pageType, place, category, events]);

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest && target.closest("a");
    if (!anchor) return;
    try {
      const href = (anchor as HTMLAnchorElement).getAttribute("href") || "";
      const match = href.match(/\/e\/(.+)$/);
      const slug = match ? match[1] : undefined;
      const idx = slug ? events.findIndex((ev) => ev.slug === slug) : -1;
      sendGoogleEvent("promoted.item_click", {
        placement,
        pageType,
        place,
        category,
        slug,
        position: idx >= 0 ? idx + 1 : undefined,
      });
    } catch (_) {}
  };

  return (
    <div ref={ref} onClick={onClick} data-placement={placement}>
      {children}
    </div>
  );
}