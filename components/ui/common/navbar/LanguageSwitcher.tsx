"use client";

import { useCallback, useMemo, type ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { usePathname, useRouter } from "../../../../i18n/routing";
import { startNavigationFeedback } from "@lib/navigation-feedback";
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  SUPPORTED_LOCALES,
  type AppLocale,
} from "types/i18n";
import { stripLocalePrefix } from "@utils/i18n-routing";

function buildCookieString(nextLocale: AppLocale) {
  const secureFlag =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; secure"
      : "";
  return `${LOCALE_COOKIE}=${nextLocale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax${secureFlag}`;
}

export default function LanguageSwitcher() {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("Components.Navbar");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const normalizedPath = useMemo(() => {
    const currentPath = pathname || "/";
    const { pathnameWithoutLocale } = stripLocalePrefix(currentPath);
    return pathnameWithoutLocale || "/";
  }, [pathname]);

  const options = useMemo(
    () =>
      SUPPORTED_LOCALES.map((value) => ({
        value,
        label: t(`languages.${value}`),
      })),
    [t]
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const nextLocale = event.target.value as AppLocale;
      if (nextLocale === locale) return;

      const search = searchParams.toString();
      const target = search
        ? `${normalizedPath}?${search}`
        : normalizedPath || "/";

      startNavigationFeedback();
      document.cookie = buildCookieString(nextLocale);
      router.replace(target || "/", { locale: nextLocale });
      // Ensure refresh happens after navigation so messages reload under new locale
      requestAnimationFrame(() => {
        router.refresh();
      });
    },
    [locale, normalizedPath, router, searchParams]
  );

  return (
    <label className="flex items-center gap-2 label text-foreground/80">
      <span className="sr-only">{t("languageLabel")}</span>
      <select
        aria-label={t("languageLabel")}
        className="rounded-input border border-border bg-background px-button-x py-button-y text-foreground"
        onChange={handleChange}
        value={locale}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

