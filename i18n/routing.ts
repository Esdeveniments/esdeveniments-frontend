import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

import {
  DEFAULT_LOCALE,
  LOCALE_PREFIX_STRATEGY,
  SUPPORTED_LOCALES,
} from "../types/i18n";

export const routing = defineRouting({
  defaultLocale: DEFAULT_LOCALE,
  locales: SUPPORTED_LOCALES,
  localePrefix: LOCALE_PREFIX_STRATEGY,
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);


