// UI specific component prop types
import type React from "react";
import type { LinkProps } from "next/link";

export interface PressFeedbackOptions {
  disabled?: boolean;
}

export interface PressFeedbackHandlers {
  onPointerDown: React.PointerEventHandler<HTMLElement>;
  onPointerUp: React.PointerEventHandler<HTMLElement>;
  onPointerLeave: React.PointerEventHandler<HTMLElement>;
  onKeyDown: React.KeyboardEventHandler<HTMLElement>;
  onKeyUp: React.KeyboardEventHandler<HTMLElement>;
  onBlur: React.FocusEventHandler<HTMLElement>;
}

export interface PressFeedbackResult {
  isPressed: boolean;
  handlers: PressFeedbackHandlers;
}

export type NavigationFeedbackEvent = "start" | "complete";

export type NavigationFeedbackListener = (
  event: NavigationFeedbackEvent
) => void;

export interface NavigationProgressState {
  isVisible: boolean;
  isNavigating: boolean;
  progress: number;
}

export type PlainMouseEvent = Pick<
  React.MouseEvent | MouseEvent,
  "button" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey"
>;

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

export interface CardLinkProps
  extends Omit<PressableLinkBaseProps, "variant" | "disableNavigationSignal"> {}

export type PressableLinkVariant = "inline" | "card" | "chip" | "plain";

export interface PressableLinkBaseProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>,
    LinkProps {
  className?: string;
  children: React.ReactNode;
  variant?: PressableLinkVariant;
  disableNavigationSignal?: boolean;
}

export interface PressableLinkProps extends PressableLinkBaseProps {}

export interface PressableAnchorProps extends PressableLinkBaseProps {}
