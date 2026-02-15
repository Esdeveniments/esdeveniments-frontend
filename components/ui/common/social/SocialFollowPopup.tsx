"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import useCheckMobileScreen from "@components/hooks/useCheckMobileScreen";
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

/** Document scroll height that must be reached (50 % of scrollable area). */
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
  { platform: "tiktok", label: "TikTok", href: socialLinks.tiktok },
  { platform: "mastodon", label: "Mastodon", href: socialLinks.mastodon },
] as const;

const LINK_CLASS =
  "flex-center gap-2 px-4 py-2.5 rounded-full border border-border/60 bg-muted/40 hover:bg-primary/10 hover:border-primary/40 hover:scale-105 transition-all duration-normal text-foreground body-small font-medium no-underline";

export default function SocialFollowPopup({ pathname }: { pathname: string }) {
  const t = useTranslations("Components.SocialFollowPopup");
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const hasTriggeredRef = useRef(false);
  const isMobile = useCheckMobileScreen();

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

  // Dismiss on Escape key (WAI-ARIA modal pattern)
  useEffect(() => {
    if (!isVisible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isVisible, dismiss]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!isVisible) return null;

  /* ------------------------------------------------------------------ */
  /*  Mobile: nonmodal bottom toast (less intrusive, avoids Google       */
  /*  mobile interstitial penalty).                                     */
  /* ------------------------------------------------------------------ */
  if (isMobile) {
    return (
      <div
        className={`fixed bottom-0 inset-x-0 z-modal p-4 pb-safe ${isClosing ? "animate-slide-down" : "animate-slide-up"
          }`}
        role="complementary"
        aria-label={t("aria")}
      >
        <div className="relative w-full bg-background rounded-card border border-border shadow-2xl p-card-padding">
          {/* Close button */}
          <button
            onClick={dismiss}
            className="absolute top-3 right-3 p-1.5 rounded-full text-foreground/60 hover:text-foreground hover:bg-muted transition-all duration-fast"
            aria-label={t("close")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <div className="flex flex-col items-center text-center gap-element-gap-sm">
            <h2 className="heading-4 text-foreground-strong">
              {t("headline")}
            </h2>

            <p className="body-small text-foreground/80">
              {t("subtext")}
            </p>

            {/* Horizontal scroll row on mobile */}
            <div className="flex gap-2 overflow-x-auto w-full py-1 -mx-1 px-1 no-scrollbar">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.platform}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={LINK_CLASS}
                  aria-label={social.label}
                >
                  <span className="text-primary">
                    <SocialIcon platform={social.platform} className="w-5 h-5" />
                  </span>
                  {social.label}
                </a>
              ))}
            </div>

            <button
              onClick={dismiss}
              className="body-small text-foreground/50 hover:text-foreground/70 transition-colors duration-fast"
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
        className={`relative w-full max-w-md bg-background rounded-card border border-border shadow-2xl p-card-padding transition-transform duration-slower ${isClosing ? "scale-95" : "scale-100"
          }`}
      >
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 p-1.5 rounded-full text-foreground/60 hover:text-foreground hover:bg-muted transition-all duration-fast"
          aria-label={t("close")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Content */}
        <div className="flex flex-col items-center text-center gap-element-gap">
          {/* Icon accent */}
          <div className="w-14 h-14 rounded-full bg-primary/10 flex-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7 text-primary">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
          </div>

          {/* Headline — Loss Aversion hook */}
          <h2 className="heading-3 text-foreground-strong">
            {t("headline")}
          </h2>

          {/* Subtext — Commitment & Consistency + Endowment Effect */}
          <p className="body-normal text-foreground/80">
            {t("subtext")}
          </p>

          {/* Social links grid */}
          <div className="grid grid-cols-2 gap-2.5 w-full pt-1">
            {SOCIAL_LINKS.map((social) => (
              <a
                key={social.platform}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className={LINK_CLASS}
                aria-label={social.label}
              >
                <span className="text-primary">
                  <SocialIcon platform={social.platform} className="w-5 h-5" />
                </span>
                {social.label}
              </a>
            ))}
          </div>

          {/* Dismiss text */}
          <button
            onClick={dismiss}
            className="body-small text-foreground/50 hover:text-foreground/70 transition-colors duration-fast mt-1"
          >
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
}
