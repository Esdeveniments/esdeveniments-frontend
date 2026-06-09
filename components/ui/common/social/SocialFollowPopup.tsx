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

export default function SocialFollowPopup({ pathname }: { pathname: string }) {
  const t = useTranslations("Components.SocialFollowPopup");
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isSubscribingPush, setIsSubscribingPush] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const hasTriggeredRef = useRef(false);
  const hasTrackedOfferRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const isMobile = useCheckMobileScreen();
  const {
    state: pushState,
    subscribe: subscribeToPush,
  } = usePushNotifications();
  const {
    installState,
    isInstalled,
    canPromptInstall,
    showIosInstructions,
    promptInstall,
  } = usePwaInstall();

  const shouldShowPushCta =
    (isInstalled || installState === "not-available") &&
    pushState !== "unsupported";

  const dismiss = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);

      const current = getPopupState();
      savePopupState({
        dismissCount: (current?.dismissCount ?? 0) + 1,
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
      } else {
        sendGoogleEvent("push_optin_failed", {
          source: "social_follow_popup",
          device: isMobile ? "mobile" : "desktop",
          permission: Notification.permission,
        });
      }
    } finally {
      setIsSubscribingPush(false);
    }
  }, [subscribeToPush, isMobile]);

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
    } finally {
      setIsInstalling(false);
    }
  }, [canPromptInstall, isMobile, promptInstall]);

  // Escape key + focus trap for desktop modal (WAI-ARIA dialog pattern)
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

    // Move focus into the dialog on open (desktop only)
    if (!isMobile) {
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      firstFocusable?.focus();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
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
  /*  Mobile: nonmodal bottom toast (less intrusive, avoids Google       */
  /*  mobile interstitial penalty).                                     */
  /* ------------------------------------------------------------------ */
  if (isMobile) {
    return (
      <div
        className={`fixed bottom-16 inset-x-0 z-modal p-4 pb-safe ${isClosing ? "animate-slide-down" : "animate-slide-up"
          }`}
        role="complementary"
        aria-label={t("aria")}
      >
        <div className="relative w-full bg-background rounded-card border border-border shadow-2xl overflow-hidden">
          {/* Gradient accent bar */}
          <div className="h-1 bg-gradient-to-r from-primary via-primary to-primary/70" />

          <div className="p-card-padding flex flex-col gap-element-gap-sm">
            {/* Close button */}
            <button
              onClick={dismiss}
              className="absolute top-4 right-4 p-1 rounded-full text-foreground/60 hover:text-foreground hover:bg-muted transition-all duration-fast"
              aria-label={t("close")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Header */}
            <div className="text-center">
              <h2 className="heading-3 text-foreground-strong mb-2">
                {t("headline")}
              </h2>
              <p className="body-small text-foreground/75">
                {t("subtext")}
              </p>
            </div>

            {/* Install section */}
            {canPromptInstall || showIosInstructions ? (
              <div className="bg-primary/5 border border-primary/20 rounded-card p-3.5 flex flex-col gap-2.5">
                {canPromptInstall ? (
                  <button
                    onClick={handleInstall}
                    disabled={isInstalling}
                    className="btn-primary w-full text-sm"
                    aria-label={t("installEnable")}
                  >
                    {isInstalling ? t("installEnabling") : t("installEnable")}
                  </button>
                ) : null}
                {showIosInstructions ? (
                  <p className="body-small text-foreground/70 text-center leading-relaxed">
                    {t("installIosHelp")}
                  </p>
                ) : null}
              </div>
            ) : null}

            {/* Push section */}
            {shouldShowPushCta ? (
              <div className="bg-surface-muted/40 rounded-card p-3.5 flex flex-col gap-2.5">
                {pushState === "unsubscribed" ? (
                  <button
                    onClick={handleSubscribePush}
                    disabled={isSubscribingPush}
                    className="btn-primary w-full text-sm"
                    aria-label={t("pushEnable")}
                  >
                    {isSubscribingPush ? t("pushEnabling") : t("pushEnable")}
                  </button>
                ) : null}
                {pushState === "denied" ? (
                  <p className="body-small text-foreground/70 text-center">{t("pushBlockedHelp")}</p>
                ) : null}
                {pushState === "subscribed" ? (
                  <p className="body-small text-primary font-medium text-center">{t("pushEnabled")}</p>
                ) : null}
              </div>
            ) : null}

            {/* Social links */}
            <div className="flex flex-col gap-2">
              <p className="body-small font-semibold text-foreground/70 text-center uppercase tracking-wide">
                {t("followLabel")}
              </p>
              <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 no-scrollbar justify-center">
                {SOCIAL_LINKS.map((social) => (
                  <a
                    key={social.platform}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-center gap-1.5 px-3.5 py-2 rounded-full border border-border/60 bg-muted/30 hover:bg-primary/10 hover:border-primary/40 hover:scale-105 transition-all duration-normal text-foreground body-small font-medium no-underline flex-shrink-0"
                    aria-label={social.label}
                  >
                    <span className="text-primary">
                      <SocialIcon platform={social.platform} className="w-4 h-4" />
                    </span>
                  </a>
                ))}
              </div>
            </div>

            {/* Dismiss */}
            <button
              onClick={dismiss}
              className="body-small text-foreground/50 hover:text-foreground/70 transition-colors duration-fast py-1.5"
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
      className={`fixed inset-0 z-modal flex-center p-4 ${isClosing ? "animate-disappear" : "animate-appear"
        }`}
      role="dialog"
      aria-modal="true"
      aria-label={t("aria")}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
        onClick={dismiss}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`relative w-full max-w-md bg-background rounded-card border border-border shadow-2xl overflow-hidden transition-transform duration-slower ${isClosing ? "scale-95" : "scale-100"
          }`}
      >
        {/* Gradient accent bar */}
        <div className="h-1.5 bg-gradient-to-r from-primary via-primary to-primary/70" />

        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 z-10 p-1 rounded-full text-foreground/60 hover:text-foreground hover:bg-muted transition-all duration-fast"
          aria-label={t("close")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Content */}
        <div className="p-6 sm:p-8 flex flex-col gap-6">
          {/* Header section */}
          <div className="flex flex-col gap-3 text-center">
            {/* Icon accent */}
            <div className="w-12 h-12 rounded-full bg-primary/10 flex-center mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 text-primary">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
              </svg>
            </div>

            {/* Headline */}
            <h2 className="heading-2 text-foreground-strong">
              {t("headline")}
            </h2>

            {/* Subtext */}
            <p className="body-normal text-foreground/75 leading-relaxed">
              {t("subtext")}
            </p>
          </div>

          {/* Install section */}
          {canPromptInstall || showIosInstructions ? (
            <div className="flex flex-col gap-3 bg-primary/5 border border-primary/20 rounded-card p-4">
              {canPromptInstall ? (
                <button
                  onClick={handleInstall}
                  disabled={isInstalling}
                  className="btn-primary w-full justify-center"
                  aria-label={t("installEnable")}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  {isInstalling ? t("installEnabling") : t("installEnable")}
                </button>
              ) : null}
              {showIosInstructions ? (
                <p className="body-small text-foreground/70 text-center leading-relaxed">
                  {t("installIosHelp")}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Social links */}
          <div className="flex flex-col gap-3">
            <p className="body-small font-semibold text-foreground/60 text-center uppercase tracking-wide">
              {t("followLabel")}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.platform}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-center gap-1.5 px-3 py-2.5 rounded-card border border-border/60 bg-muted/30 hover:bg-primary/10 hover:border-primary/40 hover:scale-105 transition-all duration-normal text-foreground body-small font-medium no-underline"
                  title={social.label}
                >
                  <span className="text-primary">
                    <SocialIcon platform={social.platform} className="w-5 h-5" />
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Push notification section */}
          {shouldShowPushCta ? (
            <div className="flex flex-col gap-3 bg-surface-muted/40 border border-border/40 rounded-card p-4">
              {pushState === "unsubscribed" ? (
                <button
                  onClick={handleSubscribePush}
                  disabled={isSubscribingPush}
                  className="btn-primary w-full justify-center"
                  aria-label={t("pushEnable")}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                    <path d="M18 8h1a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V12a4 4 0 0 1 4-4h1V6a4 4 0 0 1 8 0v2zM10 19v-6m4 6v-6" />
                  </svg>
                  {isSubscribingPush ? t("pushEnabling") : t("pushEnable")}
                </button>
              ) : null}
              {pushState === "denied" ? (
                <p className="body-small text-foreground/70 text-center">{t("pushBlockedHelp")}</p>
              ) : null}
              {pushState === "subscribed" ? (
                <div className="flex items-center justify-center gap-2 py-1">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-success">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  <p className="body-small text-success font-medium">{t("pushEnabled")}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Dismiss button */}
          <button
            onClick={dismiss}
            className="body-small text-foreground/50 hover:text-foreground/70 transition-colors duration-fast py-2"
          >
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
}
