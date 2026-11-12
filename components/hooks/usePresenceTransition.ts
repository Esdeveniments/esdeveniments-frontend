"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { afterTransitions } from "@utils/browser";

/**
 * Animates an element in and out with plain CSS transitions on its
 * `data-closed` state (styles: `data-[closed]:…` / `group-data-[closed]:…`).
 * Give the element `ref`, `data-closed={closed ? "" : undefined}` and
 * `inert={leaving}`, and render it only while `mounted`.
 *
 * - In: it renders closed for a frame, then opens, so it transitions in on
 *   every browser (no `@starting-style`).
 * - Out: it closes and stays mounted until its transitions, and its
 *   children's, have finished (at once under reduced motion). Meanwhile
 *   `leaving` is true: make it `inert`, so it takes no focus or clicks and
 *   leaves the accessibility tree as soon as it's dismissed.
 * - Showing it again mid-exit reverses from where it is: transitions
 *   retarget, keyframes would jump.
 */
export function usePresenceTransition<T extends HTMLElement>(show: boolean) {
  const ref = useRef<T>(null);
  const [mounted, setMounted] = useState(show);
  const [closed, setClosed] = useState(true);
  // Adjust state while rendering (react.dev), so the element mounts closed in
  // the same render as `show` and effects that look for it find it.
  if (show && !mounted) setMounted(true);
  if (!show && !closed) setClosed(true);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (show) {
      if (!closed) return;
      // Let the closed state paint once, then open: opening before the closed
      // style was ever computed would give nothing to transition from.
      let frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => setClosed(false));
      });
      return () => cancelAnimationFrame(frame);
    }
    return afterTransitions(el, () => setMounted(false));
  }, [show, closed, mounted]);

  return { ref, mounted, closed, leaving: !show };
}
