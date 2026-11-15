"use client";

import { useLocale } from "next-intl";
import ActiveLink from "@components/ui/common/link";
import { usePathname } from "@i18n/routing";
import { buildLoginHref } from "@utils/i18n-routing";
import type { AppLocale } from "types/i18n";
import type { NavbarLoginLinkProps } from "types/props";

// Login links only render after auth resolves on the client, so this
// usePathname() never runs during SSR and can't suspend the navbar shell.
export default function NavbarLoginLink(props: NavbarLoginLinkProps) {
  const pathname = usePathname();
  const locale = useLocale() as AppLocale;
  const loginHref = buildLoginHref(pathname, locale);

  return <ActiveLink {...props} href={loginHref} rel="nofollow" />;
}
