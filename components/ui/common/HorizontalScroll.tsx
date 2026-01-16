"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronRightIcon, ChevronLeftIcon } from "@heroicons/react/24/solid";
import type { HorizontalScrollProps } from "types/ui";

/**
 * Lightweight horizontal scroller with subtle gradients that hint scrollability.
 * - Shows right gradient by default on touch/mobile when content overflows
 * - Hides hints after first scroll or a short timeout
 * - Adds left gradient when not at the start
 */
export default function HorizontalScroll({
  className,
  children,
  ariaLabel,
  nudgeOnFirstLoad = false,
  showDesktopArrows = false,
  scrollStepPx,
  hintStorageKey,
  labels,
}: HorizontalScrollProps) {
  const uniqueId = useId();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const measuredStepRef = useRef<number>(scrollStepPx ?? 320);
  const lastMeasuredWidthRef = useRef<number>(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isFinePointer, setIsFinePointer] = useState(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const measureStep = () => {
      if (typeof scrollStepPx === "number") {
        measuredStepRef.current = scrollStepPx;
        return;
      }
      const width = el.clientWidth;
      if (
        width === lastMeasuredWidthRef.current &&
        typeof measuredStepRef.current === "number"
      ) {
        return;
      }
      const firstItem = el.querySelector(
        '[role="listitem"]'
      ) as HTMLElement | null;
      const track = el.firstElementChild as HTMLElement | null;
      const style = track ? getComputedStyle(track) : null;
      const gapPx =
        style ? parseFloat(style.columnGap || style.gap || "0") || 0 : 0;
      lastMeasuredWidthRef.current = width;
      if (firstItem) {
        measuredStepRef.current = Math.round(
          firstItem.getBoundingClientRect().width + gapPx
        );
        return;
      }
      measuredStepRef.current = Math.round(el.clientWidth * 0.9);
    };

    const updateFlags = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setAtStart(scrollLeft <= 1);
      setAtEnd(scrollLeft + clientWidth >= scrollWidth - 1);
    };

    // Detect if overflow exists
    const updateOverflowAndHint = () => {
      const { scrollWidth, clientWidth } = el;
      const hasOverflow = scrollWidth > clientWidth + 2;
      const prefersCoarse =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(pointer: coarse)").matches;
      const prefersFine =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(pointer: fine)").matches;
      setIsFinePointer(prefersFine);
      setShowHint(hasOverflow && prefersCoarse);
      measureStep();
      updateFlags();
    };

    let measureRaf: number | undefined;
    const scheduleOverflowAndHint = () => {
      if (measureRaf) window.cancelAnimationFrame(measureRaf);
      measureRaf = window.requestAnimationFrame(updateOverflowAndHint);
    };

    scheduleOverflowAndHint();

    // Optional one-time nudge to hint scroll on touch devices
    let forward: number | undefined;
    let backward: number | undefined;
    let hintTimeout: number | undefined;
    try {
      const storageKey =
        hintStorageKey ||
        (ariaLabel
          ? `hs_seen_hint_${ariaLabel.toLowerCase()}`
          : `hs_seen_hint_${uniqueId.replace(/:/g, "-")}`);
      const prefersReduced =
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const prefersCoarse =
        window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
      const hasSeen = sessionStorage.getItem(storageKey) === "1";
      const hasOverflow = el.scrollWidth > el.clientWidth + 2;

      if (
        nudgeOnFirstLoad &&
        !hasSeen &&
        !prefersReduced &&
        prefersCoarse &&
        hasOverflow &&
        el.scrollLeft <= 1
      ) {
        sessionStorage.setItem(storageKey, "1");
        // Make the hint a bit stronger while nudging (defer to avoid direct setState in effect)
        // Note: This 0ms timeout is just to defer out of the effect - cleared in cleanup
        hintTimeout = window.setTimeout(() => setShowHint(true), 0);
        // small delayed nudge then reset
        const nudgePx = 16;
        const nudgeDelay = 250;
        const backDelay = 500;
        forward = window.setTimeout(() => {
          el.scrollBy({ left: nudgePx, behavior: "smooth" });
        }, nudgeDelay);
        backward = window.setTimeout(() => {
          el.scrollTo({ left: 0, behavior: "smooth" });
        }, nudgeDelay + backDelay);
      }
    } catch {
      // noop: sessionStorage or matchMedia may be unavailable
    }
    let scrollRaf: number | undefined;
    const onScroll = () => {
      if (scrollRaf) window.cancelAnimationFrame(scrollRaf);
      scrollRaf = window.requestAnimationFrame(() => {
        updateFlags();
        if (el.scrollLeft > 8) setShowHint(false);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });

    // Hide hint after a short time if the user doesn't interact
    const t = window.setTimeout(() => setShowHint(false), 2500);

    const onResize = () => scheduleOverflowAndHint();
    window.addEventListener("resize", onResize);
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(scheduleOverflowAndHint)
        : null;
    ro?.observe(el);

    return () => {
      window.clearTimeout(t);
      if (hintTimeout) window.clearTimeout(hintTimeout);
      if (forward) window.clearTimeout(forward);
      if (backward) window.clearTimeout(backward);
      if (scrollRaf) window.cancelAnimationFrame(scrollRaf);
      if (measureRaf) window.cancelAnimationFrame(measureRaf);
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
    };
  }, [ariaLabel, hintStorageKey, nudgeOnFirstLoad, scrollStepPx, uniqueId]);

  const computeStep = () => {
    if (typeof scrollStepPx === "number") return scrollStepPx;
    return measuredStepRef.current;
  };

  const scrollByStep = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = computeStep() * dir;
    el.scrollBy({ left: step, behavior: "smooth" });
  };

  return (
    <div className={["relative", className].filter(Boolean).join(" ")}>
      {/* Scroll container */}
      <div
        ref={scrollerRef}
        role="list"
        aria-roledescription="carousel"
        aria-label={ariaLabel}
        className={[
          // base container styles
          "w-full flex overflow-x-auto min-w-0 scroll-smooth snap-x snap-mandatory",
          // enable momentum scrolling in iOS
          "[scrollbar-width:thin] [-webkit-overflow-scrolling:touch]",
        ].join(" ")}
      >
        {children}
      </div>

      {/* Left gradient (if not at start) */}
      {!atStart && (
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 h-full w-10 sm:w-12 bg-gradient-to-r from-background to-transparent z-0"
        >
          <div className="h-full w-full flex items-center justify-start pl-1 text-muted-foreground">
            {!(isFinePointer && showDesktopArrows) && (
              <ChevronLeftIcon className="h-4 w-4" />
            )}
          </div>
        </div>
      )}

      {/* Right gradient hint (show on overflow and before first scroll) */}
      {!atEnd && (
        <div
          aria-hidden
          className={[
            "pointer-events-none absolute right-0 top-0 h-full w-10 sm:w-12 bg-gradient-to-l from-background to-transparent z-0",
            showHint ? "opacity-100" : "opacity-70",
          ].join(" ")}
        >
          <div
            className={[
              "h-full w-full flex items-center justify-end pr-1",
              showHint ? "text-muted-foreground" : "text-foreground/40",
            ].join(" ")}
          >
            {!(isFinePointer && showDesktopArrows) && (
              <ChevronRightIcon
                className={showHint ? "h-5 w-5 drop-shadow" : "h-4 w-4"}
              />
            )}
          </div>
        </div>
      )}

      {/* Desktop arrows (fine pointer + >=sm) */}
      {showDesktopArrows && isFinePointer && (
        <>
          {!atStart && (
            <button
              type="button"
              aria-label={labels?.previous || "Previous"}
              onClick={() => scrollByStep(-1)}
              className="hidden sm:flex items-center justify-center absolute left-2 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-background shadow-md ring-1 ring-border/60 z-10 transition-interactive hover:shadow-lg"
            >
              <ChevronLeftIcon className="h-7 w-7 text-foreground/95 drop-shadow" />
            </button>
          )}
          {!atEnd && (
            <button
              type="button"
              aria-label={labels?.next || "Next"}
              onClick={() => scrollByStep(1)}
              className="hidden sm:flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-background shadow-md ring-1 ring-border/60 z-10 transition-interactive hover:shadow-lg"
            >
              <ChevronRightIcon className="h-7 w-7 text-foreground/95 drop-shadow" />
            </button>
          )}
        </>
      )}
    </div>
  );
}
