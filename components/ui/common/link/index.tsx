"use client";

import { usePathname } from "next/navigation";
import PressableLink from "@components/ui/primitives/PressableLink";
import { ActiveLinkProps } from "types/common";

export default function ActiveLink({
  children,
  activeLinkClass,
  className,
  href,
  url,
  ...props
}: ActiveLinkProps & { url?: string }) {
  const pathname = usePathname();
  const linkHref = href || url || "/";

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
