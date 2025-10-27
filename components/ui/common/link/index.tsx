"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
    "flex justify-center items-center gap-2 text-foreground-strong bg-background py-2 px-3 label ease-in-out duration-200";

  if (pathname === linkHref) {
    classNameProps = `${
      activeLinkClass
        ? activeLinkClass
        : "text-primary bg-background border-b-2 border-primary ease-in-out duration-200"
    } ${classNameProps}`;
  }

  return (
    <Link
      {...props}
      href={linkHref}
      prefetch={false}
      className={classNameProps}
    >
      {children}
    </Link>
  );
}
