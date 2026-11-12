"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "../../../../i18n/routing";
import { startNavigationFeedback } from "@lib/navigation-feedback";
import { ensureGtag, sendGoogleEvent } from "@utils/analytics";
import type { LanguageMenuProps, LanguageSwitcherProps } from "types/props";
import {
  SUPPORTED_LOCALES,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  type AppLocale,
} from "types/i18n";

function buildCookieString(nextLocale: AppLocale) {
  const secureFlag =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; secure"
      : "";
  return `${LOCALE_COOKIE}=${nextLocale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax${secureFlag}`;
}

function setCookie(nextLocale: AppLocale) {
  document.cookie = buildCookieString(nextLocale);
}

// Rendered only while the menu is open, so usePathname() never runs during
// SSR: it would suspend the whole navbar in the generic shell of /[place],
// /e/[eventId] and other routes with params.
function LanguageMenu({ options, locale, onSelect }: LanguageMenuProps) {
  const pathname = usePathname();

  return (
    <div className="absolute right-0 z-dropdown mt-2 w-32 origin-top-right animate-appear rounded-card bg-background border border-border shadow-dropdown focus:outline-none">
      <div className="py-1">
        {options.map((option) => (
          <Link
            key={option.value}
            href={pathname}
            locale={option.value}
            onClick={() => onSelect(option.value)}
            className={`
              ${locale === option.value ? "font-bold bg-muted" : ""}
              block px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors
            `}
          >
            {option.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function LanguageSwitcher({
  compact = false,
}: LanguageSwitcherProps) {
  const locale = useLocale();
  const t = useTranslations("Components.Navbar");
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const options = useMemo(
    () =>
      SUPPORTED_LOCALES.map((value) => ({
        value,
        label: t(`languagesShort.${value}`),
      })),
    [t]
  );

  const currentLabel = options.find((o) => o.value === locale)?.label;

  // Handle click outside to close menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleLanguageChange = (nextLocale: AppLocale) => {
    setIsOpen(false);
    if (nextLocale === locale) return;

    ensureGtag();
    sendGoogleEvent("language_switch", { from: locale, to: nextLocale });
    startNavigationFeedback();

    // Set cookie immediately so server sees it on next request
    setCookie(nextLocale);

    // Refresh router to ensure server components re-render with new locale
    // We do this after a microtask to let the Link navigation start
    requestAnimationFrame(() => {
      router.refresh();
    });
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full rounded-input border text-foreground min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary/50 transition-interactive ${
          compact
            ? "border-transparent bg-transparent px-2 gap-1 hover:bg-muted"
            : "border-border bg-background pl-button-x pr-3 py-button-y md:min-h-0 gap-2 hover:border-border/80"
        }`}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span>{currentLabel}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
          className={`${compact ? "w-4 h-4" : "w-5 h-5"} text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <LanguageMenu
          options={options}
          locale={locale}
          onSelect={handleLanguageChange}
        />
      )}
    </div>
  );
}

