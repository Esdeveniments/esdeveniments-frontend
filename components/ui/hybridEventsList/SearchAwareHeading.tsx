"use client";

import { ReactElement, useEffect } from "react";
import type { SearchAwareHeadingProps } from "types/props";
import { appendSearchQuery } from "@utils/notFoundMessaging";
import { useUrlFilters } from "@components/hooks/useUrlFilters";
import { useLocale } from "next-intl";
import type { AppLocale } from "types/i18n";
import HeadingLayout from "./HeadingLayout";

export default function SearchAwareHeading({
  pageData,
  categories = [],
  titleClass,
  subtitleClass,
  cta,
}: SearchAwareHeadingProps): ReactElement | null {
  const { queryParams } = useUrlFilters(categories);
  const searchTerm = queryParams.search;
  const locale = useLocale() as AppLocale;

  // Hide the server-rendered heading when client enhancement loads
  // Must be called before any early returns to satisfy React Hooks rules
  // Also set aria-hidden for accessibility when hiding
  useEffect(() => {
    if (!searchTerm) return;
    const serverHeading = document.querySelector(
      "[data-server-heading]"
    );
    if (serverHeading instanceof HTMLElement) {
      serverHeading.style.display = "none";
      serverHeading.setAttribute("aria-hidden", "true");
    }
    return () => {
      if (serverHeading instanceof HTMLElement) {
        serverHeading.style.display = "";
        serverHeading.removeAttribute("aria-hidden");
      }
    };
  }, [searchTerm]);

  // Only enhance if there's a search query
  if (!searchTerm) {
    return null;
  }

  const enhancedTitle = appendSearchQuery(pageData.title, searchTerm, locale);
  const enhancedSubtitle = appendSearchQuery(pageData.subTitle, searchTerm, locale);

  return (
    <HeadingLayout
      title={enhancedTitle}
      subtitle={enhancedSubtitle}
      titleClass={titleClass}
      subtitleClass={subtitleClass}
      cta={cta}
    />
  );
}
