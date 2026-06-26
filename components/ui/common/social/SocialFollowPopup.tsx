"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import useCheckMobileScreen from "@components/hooks/useCheckMobileScreen";
import { usePushNotifications } from "@components/hooks/usePushNotifications";
import { usePwaInstall } from "@components/hooks/usePwaInstall";
import { sendGoogleEvent } from "@utils/analytics";
import { SocialIcon } from "./icons";
import type { SocialPopupState } from "types/props";
import { socialLinks } from "@config/index";

export const STORAGE_KEY = "social-follow-popup";
export const PAGE_VIEW_KEY = "social-popup-views";
export const SCROLL_PERCENT = 0.35;
export const DELAY_MS = 10_000;
export const COOLDOWN_DAYS = 30;
export const MAX_DISMISSALS = 3;
export const MIN_PAGE_VIEWS = 2;
/** How long the push success state stays visible before auto-closing. */
export const SUCCESS_AUTO_CLOSE_MS = 2_500;

function getPopupState(): SocialPopupState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SocialPopupState;
  } catch {
    return null;
  }
}

function savePopupState(state: SocialPopupState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable
  }
}

/** Increment and return the session page-view count.
 *  Deduplicates by pathname so Strict-Mode double-invocations
 *  and staying on the same page don't inflate the counter. */
function trackPageView(pathname: string): number {
  try {
    const lastPath = sessionStorage.getItem(PAGE_VIEW_KEY + "-path");
    if (lastPath === pathname) {
      return Number(sessionStorage.getItem(PAGE_VIEW_KEY) ?? "1");
    }
    const count = Number(sessionStorage.getItem(PAGE_VIEW_KEY) ?? "0") + 1;
    sessionStorage.setItem(PAGE_VIEW_KEY, String(count));
    sessionStorage.setItem(PAGE_VIEW_KEY + "-path", pathname);
    return count;
  } catch {
    return 1;
  }
}

function shouldShow(): boolean {
  const state = getPopupState();
  if (!state) return true;
  if (state.dismissCount >= MAX_DISMISSALS) return false;

  const elapsed = Date.now() - state.lastDismissedAt;
  const cooldownMs = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  return elapsed >= cooldownMs;
}

/** Document scroll height that must be reached (35 % of scrollable area). */
function getScrollThreshold(): number {
  const docHeight = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight,
  );
  const viewportHeight = window.innerHeight;
  return (docHeight - viewportHeight) * SCROLL_PERCENT;
}

const SOCIAL_LINKS = [
  { platform: "instagram", label: "Instagram", href: socialLinks.instagram },
  { platform: "twitter", label: "X", href: socialLinks.twitter },
  { platform: "facebook", label: "Facebook", href: socialLinks.facebook },
  { platform: "threads", label: "Threads", href: socialLinks.threads },
  { platform: "linkedin", label: "LinkedIn", href: socialLinks.linkedin },
  { platform: "telegram", label: "Telegram", href: socialLinks.telegram },
  // { platform: "tiktok", label: "TikTok", href: socialLinks.tiktok },
  { platform: "mastodon", label: "Mastodon", href: socialLinks.mastodon },
] as const;

/* ------------------------------------------------------------------ */
/*  Shared sections (single source of truth for mobile + desktop)      */
/* ------------------------------------------------------------------ */

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/**
 * iOS "Add to Home Screen" instruction sheet, following the de-facto
 * standard pattern (react-ios-pwa-prompt, Progressier): app identity row
 * matching the native A2HS preview, then numbered steps with the real iOS
 * glyphs so users pattern-match icons instead of translating words.
 */
function IosInstallSteps({
  isIpad,
  shareLocation,
}: {
  isIpad: boolean;
  shareLocation: "safari" | "menu";
}) {
  const t = useTranslations("Components.SocialFollowPopup");
  const shareStep =
    shareLocation === "menu"
      ? t("installStepShareMenu")
      : isIpad
        ? t("installStepShareIpad")
        : t("installStepShare");
  return (
    <div className="flex flex-col">
      {/* Identity row: mirrors what iOS shows in the A2HS dialog */}
      <div className="flex items-center gap-3 pb-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- 40px static
            asset already precached by the SW; next/image adds no value */}
        <img
          src="/static/icons/icon-192x192.png"
          alt=""
          aria-hidden="true"
          width={40}
          height={40}
          className="rounded-lg border border-border/60 bg-background"
        />
        <div className="text-left">
          <p
            className="body-small font-semibold text-foreground-strong leading-tight"
            translate="no"
          >
            Esdeveniments
          </p>
          <p className="body-small text-foreground/60 leading-tight" translate="no">
            esdeveniments.cat
          </p>
        </div>
      </div>

      <ol className="flex flex-col" aria-label={t("installEnable")}>
        <li className="flex items-center gap-3 py-2.5 border-t border-border/40">
          <span className="body-small text-foreground/50 w-4 text-center flex-shrink-0">
            1
          </span>
          {shareLocation === "menu" ? (
            /* ⋯ overflow glyph for Chrome/Firefox/Edge/Opera on iOS, where
               Share sits inside the menu rather than the toolbar */
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5 flex-shrink-0 text-foreground"
              aria-hidden="true"
            >
              <circle cx="5" cy="12" r="1.6" />
              <circle cx="12" cy="12" r="1.6" />
              <circle cx="19" cy="12" r="1.6" />
            </svg>
          ) : (
            /* iOS share glyph; #007AFF replicates the system tint so users
               can pattern-match the real button (semantic tokens would
               defeat the recognition purpose) */
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#007AFF"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5 flex-shrink-0"
              aria-hidden="true"
            >
              <path d="M12 3v12M8 7l4-4 4 4" />
              <path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" />
            </svg>
          )}
          <span className="body-small text-foreground text-left">
            {shareStep}
          </span>
        </li>
        <li className="flex items-center gap-3 py-2.5 border-t border-border/40">
          <span className="body-small text-foreground/50 w-4 text-center flex-shrink-0">
            2
          </span>
          {/* iOS "Add to Home Screen" plus-square glyph */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5 flex-shrink-0 text-foreground"
            aria-hidden="true"
          >
            <rect x="4" y="4" width="16" height="16" rx="4" />
            <path d="M12 8.5v7M8.5 12h7" />
          </svg>
          <span className="body-small text-foreground text-left">
            {t("installStepAdd")}
          </span>
        </li>
      </ol>
    </div>
  );
}

function InstallSection({
  canPromptInstall,
  showIosInstructions,
  showOpenInSafariHint,
  isIpad,
  iosShareLocation,
  isInstalling,
  onInstall,
}: {
  canPromptInstall: boolean;
  showIosInstructions: boolean;
  showOpenInSafariHint: boolean;
  isIpad: boolean;
  iosShareLocation: "safari" | "menu";
  isInstalling: boolean;
  onInstall: () => void;
}) {
  const t = useTranslations("Components.SocialFollowPopup");
  if (!canPromptInstall && !showIosInstructions && !showOpenInSafariHint) {
    return null;
  }
  return (
    <div className="flex flex-col gap-2.5">
      {canPromptInstall ? (
        <button
          onClick={onInstall}
          disabled={isInstalling}
          className="btn-primary w-full justify-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="w-4 h-4"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          {isInstalling ? t("installEnabling") : t("installEnable")}
        </button>
      ) : null}
      {showIosInstructions ? (
        <IosInstallSteps isIpad={isIpad} shareLocation={iosShareLocation} />
      ) : null}
      {showOpenInSafariHint ? (
        <p className="body-small text-foreground/70 text-center leading-relaxed">
          {t("installInAppHelp")}
        </p>
      ) : null}
    </div>
  );
}

function PushSection({
  pushState,
  isSubscribing,
  onSubscribe,
}: {
  pushState: ReturnType<typeof usePushNotifications>["state"];
  isSubscribing: boolean;
  onSubscribe: () => void;
}) {
  const t = useTranslations("Components.SocialFollowPopup");
  return (
    <div
      className="flex flex-col gap-2.5 bg-muted/60 border border-border/40 rounded-card p-4"
      role="status"
      aria-live="polite"
    >
      {pushState === "unsubscribed" ? (
        <button
          onClick={onSubscribe}
          disabled={isSubscribing}
          className="btn-primary w-full justify-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="w-4 h-4"
            aria-hidden="true"
          >
            <path d="M18 8h1a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V12a4 4 0 0 1 4-4h1V6a4 4 0 0 1 8 0v2zM10 19v-6m4 6v-6" />
          </svg>
          {isSubscribing ? t("pushEnabling") : t("pushEnable")}
        </button>
      ) : null}
      {pushState === "denied" ? (
        <p className="body-small text-foreground/70 text-center">
          {t("pushBlockedHelp")}
        </p>
      ) : null}
      {pushState === "subscribed" ? (
        <div className="flex items-center justify-center gap-2 py-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5 text-success"
            aria-hidden="true"
          >
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
          <p className="body-small text-success font-medium">
            {t("pushEnabled")}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function SocialLinksSection({ variant }: { variant: "mobile" | "desktop" }) {
  const t = useTranslations("Components.SocialFollowPopup");
  return (
    <div className="flex flex-col gap-2.5">
      <p className="body-small font-semibold text-foreground/60 text-center uppercase tracking-wide">
        {t("followLabel")}
      </p>
      {variant === "mobile" ? (
        /* Horizontal scroll row. The inner `w-max mx-auto` wrapper centers
           the chips when they fit and keeps the row left-anchored (fully
           scrollable) when they overflow — `justify-center` on an
           overflowing flex container clips its start edge unreachably. */
        <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
          <div className="flex w-max mx-auto gap-1.5">
            {SOCIAL_LINKS.map((social) => (
              <a
                key={social.platform}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-center gap-1.5 px-3.5 py-2 rounded-full border border-border/60 bg-muted/30 hover:bg-primary/10 hover:border-primary/40 hover:scale-105 transition-[transform,background-color,border-color] duration-normal text-foreground body-small font-medium no-underline flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label={social.label}
              >
                <span className="text-primary">
                  <SocialIcon platform={social.platform} className="w-4 h-4" />
                </span>
              </a>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {SOCIAL_LINKS.map((social) => (
            <a
              key={social.platform}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-center gap-1.5 px-3 py-2.5 rounded-card border border-border/60 bg-muted/30 hover:bg-primary/10 hover:border-primary/40 hover:scale-105 transition-[transform,background-color,border-color] duration-normal text-foreground body-small font-medium no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label={social.label}
            >
              <span className="text-primary">
                <SocialIcon platform={social.platform} className="w-5 h-5" />
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SocialFollowPopup({ pathname }: { pathname: string }) {
  const t = useTranslations("Components.SocialFollowPopup");
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isSubscribingPush, setIsSubscribingPush] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const hasTriggeredRef = useRef(false);
  const hasTrackedOfferRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMobile = useCheckMobileScreen();
  const { state: pushState, subscribe: subscribeToPush } =
    usePushNotifications();
  const {
    installState,
    isInstalled,
    canPromptInstall,
    showIosInstructions,
    showOpenInSafariHint,
    isIpad,
    iosShareLocation,
    promptInstall,
  } = usePwaInstall();

  // Mirror latest values into refs so `dismiss` can stay referentially stable.
  // Its identity feeds the focus-trap/scroll-lock effect; if it changed when
  // installState resolves, that effect would tear down and re-run mid-popup
  // (stealing focus / toggling the scroll lock).
  const isMobileRef = useRef(isMobile);
  isMobileRef.current = isMobile;
  const installStateRef = useRef(installState);
  installStateRef.current = installState;

  // Show the push CTA once there's no pending install path: app installed,
  // or no install prompt available (incl. after the user dismissed the
  // native prompt — push still works in-browser on desktop/Android).
  const shouldShowPushCta =
    (isInstalled || installState === "not-available") &&
    pushState !== "unsupported";

  // Lead with install copy only when there's an actionable path (one-click
  // prompt, iOS steps, or the open-in-Safari hint). Without one — no-path
  // browsers, or already installed — fall back to the social headline so we
  // never promise an app the user can't get from here.
  const canInstall =
    canPromptInstall || showIosInstructions || showOpenInSafariHint;
  const headlineText = canInstall ? t("installHeadline") : t("headline");
  const subtextText = canInstall ? t("installSubtext") : t("subtext");

  /**
   * Close the popup.
   * @param countAsDismissal When false (post-success auto-close), the
   *   30-day cooldown still starts but the dismissal budget isn't burned.
   */
  const dismiss = useCallback(
    (countAsDismissal: boolean = true) => {
      // `counted: false` is a post-success auto-close, not a real decline —
      // keep both so decline rate = dismisses where counted is true.
      sendGoogleEvent("push_optin_dismiss", {
        source: "social_follow_popup",
        device: isMobileRef.current ? "mobile" : "desktop",
        install_state: installStateRef.current,
        counted: countAsDismissal,
      });
      // Cancel a pending post-success auto-close so a manual dismissal
      // doesn't trigger a second close cycle after the timer fires.
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);

      const current = getPopupState();
      savePopupState({
        dismissCount: (current?.dismissCount ?? 0) + (countAsDismissal ? 1 : 0),
        lastDismissedAt: Date.now(),
      });
    }, 300);
  }, []);

  const handleSubscribePush = useCallback(async () => {
    sendGoogleEvent("push_optin_click", {
      source: "social_follow_popup",
      device: isMobile ? "mobile" : "desktop",
    });
    setIsSubscribingPush(true);
    try {
      const ok = await subscribeToPush();
      if (ok) {
        sendGoogleEvent("push_optin_success", {
          source: "social_follow_popup",
          device: isMobile ? "mobile" : "desktop",
        });
        // Goal reached: show the success state briefly, then close without
        // burning a dismissal (closing after success isn't a rejection).
        autoCloseTimerRef.current = setTimeout(
          () => dismiss(false),
          SUCCESS_AUTO_CLOSE_MS,
        );
      } else {
        sendGoogleEvent("push_optin_failed", {
          source: "social_follow_popup",
          device: isMobile ? "mobile" : "desktop",
          permission:
            typeof Notification !== "undefined"
              ? Notification.permission
              : "unsupported",
        });
      }
    } finally {
      setIsSubscribingPush(false);
    }
  }, [subscribeToPush, isMobile, dismiss]);

  const handleInstall = useCallback(async () => {
    if (!canPromptInstall) return;
    sendGoogleEvent("pwa_install_click", {
      source: "social_follow_popup",
      device: isMobile ? "mobile" : "desktop",
    });

    setIsInstalling(true);
    try {
      const outcome = await promptInstall();
      sendGoogleEvent("pwa_install_result", {
        source: "social_follow_popup",
        device: isMobile ? "mobile" : "desktop",
        outcome,
      });
      // Stay open on "accepted": the install section disappears and the
      // push CTA takes its place — the second step of the funnel.
    } finally {
      setIsInstalling(false);
    }
  }, [canPromptInstall, isMobile, promptInstall]);

  // Clear any pending auto-close timer on unmount
  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    };
  }, []);

  // Escape key + focus trap for desktop modal (WAI-ARIA dialog pattern),
  // plus body scroll lock and focus restore.
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dismiss();
        return;
      }

      // Focus trap only applies to desktop modal
      if (e.key !== "Tab" || isMobile) return;
      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    let didLock = false;
    let previousBodyOverflow: string | null = null;
    if (!isMobile) {
      // Remember the focused element, move focus into the dialog, and lock
      // background scroll while the modal is open (desktop only — the
      // mobile toast is intentionally nonmodal).
      previousFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      firstFocusable?.focus();

      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      didLock = true;
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      // Restore based on whether this effect run actually locked, not on
      // the (correct but indirect) isMobile closure value.
      if (didLock) {
        document.body.style.overflow = previousBodyOverflow ?? "";
        previousFocusRef.current?.focus?.();
        previousFocusRef.current = null;
      }
    };
  }, [isVisible, isMobile, dismiss]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Always count page views so the counter increments on every
    // route change, even when other guards prevent the popup.
    const views = trackPageView(pathname);

    if (hasTriggeredRef.current) return;
    if (!shouldShow()) return;
    if (views < MIN_PAGE_VIEWS) return;

    const getScrollY = () =>
      window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;

    let scrolled = false;
    let timerFired = false;

    const tryShow = () => {
      if (hasTriggeredRef.current) return;
      // OR logic: either signal alone proves engagement
      if (scrolled || timerFired) {
        hasTriggeredRef.current = true;
        setIsVisible(true);
      }
    };

    const handleScroll = () => {
      if (getScrollY() >= getScrollThreshold()) {
        scrolled = true;
        tryShow();
      }
    };

    const timerId = setTimeout(() => {
      timerFired = true;
      tryShow();
    }, DELAY_MS);

    document.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      document.removeEventListener("scroll", handleScroll);
      clearTimeout(timerId);
    };
    // Re-evaluate on route change so page-view count can reach MIN_PAGE_VIEWS
  }, [pathname]);

  useEffect(() => {
    if (!isVisible || hasTrackedOfferRef.current) return;
    hasTrackedOfferRef.current = true;
    sendGoogleEvent("push_optin_offer_view", {
      source: "social_follow_popup",
      device: isMobile ? "mobile" : "desktop",
      state: pushState,
      install_state: installState,
    });
  }, [isVisible, isMobile, pushState, installState]);

  if (!isVisible) return null;

  /* ------------------------------------------------------------------ */
  /*  Mobile: nonmodal bottom toast (less intrusive, avoids Google      */
  /*  mobile interstitial penalty).                                     */
  /* ------------------------------------------------------------------ */
  if (isMobile) {
    return (
      <div
        className={`fixed bottom-16 inset-x-0 z-modal p-4 ${
          isClosing ? "animate-slide-down" : "animate-slide-up"
        }`}
        role="complementary"
        aria-label={canInstall ? t("ariaInstall") : t("aria")}
      >
        <div className="relative w-full max-h-[80vh] overflow-hidden flex flex-col bg-background rounded-card border border-border shadow-lg">
          {/* Gradient accent bar */}
          <div className="h-1 bg-gradient-to-r from-primary via-primary to-primary/70" />

          <div className="p-card-padding flex flex-col gap-element-gap-sm overflow-y-auto overscroll-contain min-h-0">
            {/* Close button */}
            <button
              onClick={() => dismiss()}
              className="absolute top-4 right-4 p-1 rounded-full text-foreground/60 hover:text-foreground hover:bg-muted transition-[color,background-color] duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label={t("close")}
            >
              <CloseIcon />
            </button>

            {/* Header */}
            <div className="text-center">
              <h2 className="heading-3 text-foreground-strong mb-2 text-balance">
                {headlineText}
              </h2>
              <p className="body-small text-foreground/75 text-pretty">{subtextText}</p>
            </div>

            <InstallSection
              canPromptInstall={canPromptInstall}
              showIosInstructions={showIosInstructions}
              showOpenInSafariHint={showOpenInSafariHint}
              isIpad={isIpad}
              iosShareLocation={iosShareLocation}
              isInstalling={isInstalling}
              onInstall={handleInstall}
            />

            {shouldShowPushCta ? (
              <PushSection
                pushState={pushState}
                isSubscribing={isSubscribingPush}
                onSubscribe={handleSubscribePush}
              />
            ) : null}

            <SocialLinksSection variant="mobile" />

            {/* Dismiss */}
            <button
              onClick={() => dismiss()}
              className="body-small text-foreground/50 hover:text-foreground/70 transition-colors duration-fast py-1.5 rounded-button focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {t("close")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Desktop: centered modal (higher conversion, no Google penalty).   */
  /* ------------------------------------------------------------------ */
  return (
    <div
      ref={dialogRef}
      className={`fixed inset-0 z-modal flex-center p-4 ${
        isClosing ? "animate-disappear" : "animate-appear"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={canInstall ? t("ariaInstall") : t("aria")}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/50"
        onClick={() => dismiss()}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`relative w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col bg-background rounded-card border border-border shadow-lg transition-transform duration-slower ${
          isClosing ? "scale-95" : "scale-100"
        }`}
      >
        {/* Gradient accent bar */}
        <div className="h-1.5 bg-gradient-to-r from-primary via-primary to-primary/70" />

        {/* Close button */}
        <button
          onClick={() => dismiss()}
          className="absolute top-4 right-4 z-10 p-1 rounded-full text-foreground/60 hover:text-foreground hover:bg-muted transition-[color,background-color] duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label={t("close")}
        >
          <CloseIcon />
        </button>

        {/* Content (scrolls; panel stays put so the close button is pinned) */}
        <div className="p-6 sm:p-8 flex flex-col gap-6 overflow-y-auto overscroll-contain min-h-0">
          {/* Header section */}
          <div className="flex flex-col gap-3 text-center">
            {/* Icon accent */}
            <div className="w-12 h-12 rounded-full bg-primary/10 flex-center mx-auto">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="w-6 h-6 text-primary"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
                />
              </svg>
            </div>

            {/* Headline */}
            <h2 className="heading-2 text-foreground-strong text-balance">
              {headlineText}
            </h2>

            {/* Subtext */}
            <p className="body-normal text-foreground/75 leading-relaxed text-pretty">
              {subtextText}
            </p>
          </div>

          <InstallSection
            canPromptInstall={canPromptInstall}
            showIosInstructions={showIosInstructions}
            showOpenInSafariHint={showOpenInSafariHint}
            isIpad={isIpad}
            iosShareLocation={iosShareLocation}
            isInstalling={isInstalling}
            onInstall={handleInstall}
          />

          <SocialLinksSection variant="desktop" />

          {shouldShowPushCta ? (
            <PushSection
              pushState={pushState}
              isSubscribing={isSubscribingPush}
              onSubscribe={handleSubscribePush}
            />
          ) : null}

          {/* Dismiss button */}
          <button
            onClick={() => dismiss()}
            className="body-small text-foreground/50 hover:text-foreground/70 transition-colors duration-fast py-2 rounded-button focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
}
