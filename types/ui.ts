// UI specific component prop types
export interface NewsCtaProps {
  href: string;
  label: string; // full text already composed (e.g., "Actualitat cultural d'Osona")
  "data-cta"?: string;
}

export interface HorizontalScrollProps {
  className?: string;
  children: React.ReactNode;
  ariaLabel?: string;
  /** Show a small auto-scroll nudge once per session on touch devices */
  nudgeOnFirstLoad?: boolean;
  /** Show clickable prev/next arrows on desktop (>= sm, pointer: fine) */
  showDesktopArrows?: boolean;
  /** Override scroll step in pixels when clicking arrows */
  scrollStepPx?: number;
  /** Storage key for the one-time nudge flag (defaults to a generic key) */
  hintStorageKey?: string;
}
