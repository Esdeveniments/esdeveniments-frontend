"use client";

import { useLocale } from "next-intl";
import { usePathname } from "../../../../i18n/routing";
import PressableLink from "@components/ui/primitives/PressableLink";
import { ActiveLinkProps } from "types/common";
import { DEFAULT_LOCALE } from "types/i18n";

export default function ActiveLink({
  children,
  activeLinkClass,
  className,
  href,
  url,
  ...props
}: ActiveLinkProps & { url?: string }) {
  const pathname = usePathname();
  const locale = useLocale();
  const rawHref = href || url || "/";
  const linkHref =
    locale === DEFAULT_LOCALE || rawHref.startsWith("http")
      ? rawHref
      : rawHref.startsWith(`/${locale}`)
        ? rawHref
        : rawHref.startsWith("/")
          ? `/${locale}${rawHref}`
          : rawHref;

  const classNames = [
    className ||
    "flex-center gap-element-gap-sm text-foreground-strong px-button-x py-button-y label transition-interactive",
  ];

  if (pathname === linkHref) {
    classNames.push(
      activeLinkClass ||
      "text-primary border-b-2 border-primary transition-interactive"
    );
  }

  return (
    <PressableLink
      {...props}
      href={linkHref}
      prefetch={false}
      className={classNames.join(" ")}
      variant="inline"
    >
      {children}
    </PressableLink>
  );
}
