import { createElement, type ComponentProps } from "react";
import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

import {
  DEFAULT_LOCALE,
  LOCALE_PREFIX_STRATEGY,
  SUPPORTED_LOCALES,
} from "../types/i18n";
import { NO_VIGNETTE_LINK_ATTRS } from "../utils/constants";

export const routing = defineRouting({
  defaultLocale: DEFAULT_LOCALE,
  locales: SUPPORTED_LOCALES,
  localePrefix: LOCALE_PREFIX_STRATEGY,
});

const navigation = createNavigation(routing);

export const { redirect, usePathname, useRouter, getPathname } = navigation;

export function Link(props: ComponentProps<typeof navigation.Link>) {
  return createElement(navigation.Link, { ...NO_VIGNETTE_LINK_ATTRS, ...props });
}


