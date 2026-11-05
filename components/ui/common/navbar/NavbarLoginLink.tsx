"use client";

import { useLocale } from "next-intl";
import ActiveLink from "@components/ui/common/link";
import { usePathname } from "@i18n/routing";
import type { Href } from "types/common";
import { DEFAULT_LOCALE } from "types/i18n";
import type { NavbarLoginLinkProps } from "types/props";

// Login links only render after auth resolves on the client, so this
// usePathname() never runs during SSR and can't suspend the navbar shell.
export default function NavbarLoginLink(props: NavbarLoginLinkProps) {
  const pathname = usePathname();
  const locale = useLocale();

  // Return users to the page they logged in from. usePathname() drops the
  // locale prefix, so add it back or es/en users land on the Catalan page.
  const returnPath =
    locale === DEFAULT_LOCALE ? pathname : `/${locale}${pathname}`;
  const loginHref: Href =
    pathname && pathname !== "/" && pathname !== "/iniciar-sessio"
      ? `/iniciar-sessio?redirect=${encodeURIComponent(returnPath)}`
      : "/iniciar-sessio";

  return <ActiveLink {...props} href={loginHref} />;
}
