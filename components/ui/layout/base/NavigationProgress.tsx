"use client";

import type { JSX } from "react";
import clsx from "clsx";
import { useNavigationProgress } from "@components/hooks/useNavigationProgress";

export default function NavigationProgress(): JSX.Element | null {
  const { isVisible, progress } = useNavigationProgress();

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
