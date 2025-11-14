"use client";

import { usePathname } from "next/navigation";
import { PendingLink } from "@components/ui/navigation/PendingLink";
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

  let classNameProps =
    className ||
    "flex-center gap-element-gap-sm text-foreground-strong px-button-x py-button-y label transition-interactive";

  if (pathname === linkHref) {
    classNameProps = `${
      activeLinkClass
        ? activeLinkClass
        : "text-primary border-b-2 border-primary transition-interactive"
    } ${classNameProps}`;
  }

  return (
    <PendingLink
      {...props}
      href={linkHref}
      className={classNameProps}
    >
      {children}
    </PendingLink>
  );
}
