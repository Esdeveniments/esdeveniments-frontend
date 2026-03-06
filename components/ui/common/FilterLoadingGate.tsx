"use client";

import { useFilterLoading } from "@components/context/FilterLoadingContext";
import type { FilterLoadingGateProps } from "types/props";

/**
 * Wraps the events list and dims it during filter navigation.
 *
 * Previously this unmounted children and mounted a skeleton, which forced
 * React to tear down and recreate 12+ card components in a single frame
 * — the main contributor to the borderline mobile INP (194ms).
 *
 * Now children stay mounted and are visually dimmed via CSS opacity.
 * The navigation progress bar (top of page) already signals loading.
 */
export default function FilterLoadingGate({
  children,
}: FilterLoadingGateProps) {
  const { isLoading } = useFilterLoading();

  return (
    <div
      className={`transition-opacity duration-150${
        isLoading ? " opacity-40 pointer-events-none" : ""
      }`}
      aria-busy={isLoading}
      {...(isLoading ? { inert: true } : {})}
    >
      {children}
    </div>
  );
}
