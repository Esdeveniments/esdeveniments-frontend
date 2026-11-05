"use client";

import { Suspense } from "react";
import { useLocale } from "next-intl";
import { usePathname } from "../../../../i18n/routing";
import PressableLink from "@components/ui/primitives/PressableLink";
import type { ActiveLinkAnchorProps, ActiveLinkProps } from "types/common";
import { DEFAULT_LOCALE } from "types/i18n";

const DEFAULT_CLASS =
  "flex-center gap-element-gap-sm text-foreground-strong px-button-x py-button-y label transition-interactive";
const DEFAULT_ACTIVE_CLASS =
  "text-primary border-b-2 border-primary transition-interactive";

function ActiveLinkAnchor({
  children,
  activeLinkClass,
  className,
  href,
  isActive,
  ...props
}: ActiveLinkAnchorProps) {
  const classNames = isActive
    ? `${className || DEFAULT_CLASS} ${activeLinkClass || DEFAULT_ACTIVE_CLASS}`
    : className || DEFAULT_CLASS;

  return (
    <PressableLink
      {...props}
      href={href}
      prefetch={false}
      className={classNames}
      variant="inline"
    >
      {children}
    </PressableLink>
  );
}

function PathnameActiveLink(props: Omit<ActiveLinkAnchorProps, "isActive">) {
  const pathname = usePathname();
  return <ActiveLinkAnchor {...props} isActive={pathname === props.href} />;
}

// usePathname() suspends while Next prerenders a route's generic shell
// (unknown params, e.g. /[place]). The tiny boundary keeps that to this one
// link: the shell shows it without the active class, and the navbar around it
// stays in the static HTML. Keep each link under ~500 bytes of HTML, or React
// moves the finished boundary out of line (see LESSONS.md).
export default function ActiveLink({
  href,
  url,
  ...props
}: ActiveLinkProps & { url?: string }) {
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

  return (
    <Suspense
      fallback={<ActiveLinkAnchor {...props} href={linkHref} isActive={false} />}
    >
      <PathnameActiveLink {...props} href={linkHref} />
    </Suspense>
  );
}
