"use client";

import type { JSX } from "react";
import { useEffect } from "react";
import clsx from "clsx";
import { useNavigationProgress } from "@components/hooks/useNavigationProgress";
import {
  isPlainLeftClick,
  startNavigationFeedback,
} from "@lib/navigation-feedback";

export default function NavigationProgress(): JSX.Element {
  const { isVisible, progress } = useNavigationProgress();

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest<HTMLAnchorElement>("[data-pressable-link]");
      if (!anchor) return;
      if (anchor.dataset.pressableManaged === "true") return;
      if (anchor.dataset.disableNavigationSignal === "true") return;
      if (anchor.getAttribute("target") === "_blank") return;
      if (!isPlainLeftClick(event)) {
        return;
      }
      startNavigationFeedback();
    };

    const options: AddEventListenerOptions = { capture: true };
    document.addEventListener("click", handleClick, options);
    return () => document.removeEventListener("click", handleClick, options);
  }, []);

  return (
    <div
      className={clsx(
        "fixed inset-x-0 top-0 h-0.5 pointer-events-none z-[100] transition-opacity duration-150",
        isVisible ? "opacity-100" : "opacity-0"
      )}
      aria-hidden="true"
    >
      <span
        className="block h-full origin-left bg-primary transition-[transform] duration-150 ease-out"
        style={{ transform: `scaleX(${Math.max(progress, 0.05)})` }}
      />
    </div>
  );
}
