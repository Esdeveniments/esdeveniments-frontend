"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import type { SocialPopupState } from "types/props";
import { socialLinks } from "@config/index";

const STORAGE_KEY = "social-follow-popup";
const SCROLL_THRESHOLD = 300;
const DELAY_MS = 8000;
const COOLDOWN_DAYS = 30;
const MAX_DISMISSALS = 3;

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

function shouldShow(): boolean {
  const state = getPopupState();
  if (!state) return true;
  if (state.dismissCount >= MAX_DISMISSALS) return false;

  const elapsed = Date.now() - state.lastDismissedAt;
  const cooldownMs = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  return elapsed >= cooldownMs;
}

const SOCIAL_LINKS = {
  instagram: {
    label: "Instagram",
    href: socialLinks.instagram,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M8 3C5.243 3 3 5.243 3 8v8c0 2.757 2.243 5 5 5h8c2.757 0 5-2.243 5-5V8c0-2.757-2.243-5-5-5H8zm0 2h8c1.654 0 3 1.346 3 3v8c0 1.654-1.346 3-3 3H8c-1.654 0-3-1.346-3-3V8c0-1.654 1.346-3 3-3zm9 1a1 1 0 0 0-1 1 1 1 0 0 0 1 1 1 1 0 0 0 1-1 1 1 0 0 0-1-1zm-5 1c-2.757 0-5 2.243-5 5s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5zm0 2c1.654 0 3 1.346 3 3s-1.346 3-3 3-3-1.346-3-3 1.346-3 3-3z" />
      </svg>
    ),
  },
  twitter: {
    label: "X",
    href: socialLinks.twitter,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" className="w-5 h-5">
        <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z" />
      </svg>
    ),
  },
  facebook: {
    label: "Facebook",
    href: socialLinks.facebook,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  threads: {
    label: "Threads",
    href: socialLinks.threads,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.187.408-2.264 1.33-3.03.858-.712 2.04-1.133 3.408-1.209 1.199-.066 2.295.048 3.27.378a5.591 5.591 0 0 0-.02-.593c-.122-1.463-.596-2.507-1.416-3.104-.893-.65-2.105-.975-3.61-.966l-.027.001c-1.542.06-2.756.544-3.61 1.44-.772.81-1.263 1.904-1.46 3.248l-2.04-.272c.258-1.726.905-3.153 1.926-4.222C7.625 3.17 9.257 2.504 11.259 2.42c1.949-.038 3.568.408 4.811 1.315 1.347.982 2.082 2.426 2.248 4.287l.012.148c.01.091.016.18.022.27 1.11.585 1.98 1.418 2.529 2.438.752 1.4 1.02 3.346.024 5.336-1.089 2.18-3.053 3.393-5.703 3.558a7.458 7.458 0 0 1-.391.011v.001ZM11.29 15.65c-.04 0-.082 0-.123.002-.856.047-1.54.303-1.975.639-.367.283-.515.622-.487 1.095.044.709.761 1.564 2.534 1.467 1.09-.06 1.886-.426 2.499-1.188.474-.59.787-1.375.935-2.334-.843-.28-1.81-.44-2.898-.44a7.035 7.035 0 0 0-.485.018v-.001l.001.742h-.001v-.742Z" />
      </svg>
    ),
  },
  linkedin: {
    label: "LinkedIn",
    href: socialLinks.linkedin,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  telegram: {
    label: "Telegram",
    href: socialLinks.telegram,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M18.384 22.779a1.19 1.19 0 0 0 1.107.145 1.16 1.16 0 0 0 .724-.84C21.084 18 23.192 7.663 23.983 3.948a.78.78 0 0 0-.26-.758.8.8 0 0 0-.797-.14C18.733 4.602 5.82 9.447.542 11.4a.827.827 0 0 0-.542.799c.012.354.25.661.593.764 2.367.708 5.474 1.693 5.474 1.693s1.452 4.385 2.209 6.615c.095.28.314.5.603.576a.866.866 0 0 0 .811-.207l3.096-2.923s3.572 2.619 5.598 4.062Zm-11.01-8.677 1.679 5.538.373-3.507 10.185-9.186a.277.277 0 0 0 .033-.377.284.284 0 0 0-.376-.064L7.374 14.102Z" />
      </svg>
    ),
  },
  tiktok: {
    label: "TikTok",
    href: socialLinks.tiktok,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
  mastodon: {
    label: "Mastodon",
    href: socialLinks.mastodon,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 2.47.62 3.68.55 2.237 2.777 4.098 4.96 4.857 2.336.792 4.849.923 7.256.38.265-.061.527-.132.786-.213.585-.184 1.27-.39 1.774-.753a.057.057 0 0 0 .023-.043v-1.809a.052.052 0 0 0-.02-.041.053.053 0 0 0-.046-.01 20.282 20.282 0 0 1-4.709.545c-2.73 0-3.463-1.284-3.674-1.818a5.593 5.593 0 0 1-.319-1.433.053.053 0 0 1 .066-.054 19.998 19.998 0 0 0 4.636.528c.564 0 1.128-.019 1.69-.056 2.006-.12 4.142-.365 5.492-.946 1.758-.757 3.248-2.484 3.387-6.514.052-1.502.063-3.206.063-4.753 0-.963-.025-1.93-.075-2.893z" />
      </svg>
    ),
  },
} as const;

const LINK_CLASS =
  "flex-center gap-2 px-4 py-2.5 rounded-full border border-border/60 bg-muted/40 hover:bg-primary/10 hover:border-primary/40 hover:scale-105 transition-all duration-normal text-foreground body-small font-medium no-underline";

export default function SocialFollowPopup() {
  const t = useTranslations("Components.SocialFollowPopup");
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const hasTriggeredRef = useRef(false);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!shouldShow()) return;

    const getScrollY = () =>
      window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;

    let scrolled = getScrollY() >= SCROLL_THRESHOLD;
    let timerFired = false;

    const tryShow = () => {
      const currentScroll = getScrollY();
      if (currentScroll >= SCROLL_THRESHOLD) {
        scrolled = true;
      }
      if (scrolled && timerFired && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        setIsVisible(true);
      }
    };

    const handleScroll = () => {
      if (getScrollY() >= SCROLL_THRESHOLD) {
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
  }, []);

  if (!isVisible) return null;

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
            {Object.values(SOCIAL_LINKS).map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className={LINK_CLASS}
                aria-label={social.label}
              >
                <span className="text-primary">{social.icon}</span>
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
