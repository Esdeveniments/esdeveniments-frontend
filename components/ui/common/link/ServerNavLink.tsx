"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ServerNavLinkProps } from "types/props";

// Client-side navigation link component with active state detection
// Converted from server component to avoid headers() usage for ISR compatibility
export default function ServerNavLink({
  href,
  children,
  className = "flex justify-center items-center gap-2 text-foreground-strong bg-background px-button-x py-button-y label ease-in-out duration-200",
  activeLinkClass,
}: ServerNavLinkProps) {
  // Get the current pathname from client-side hook (no headers() needed)
  const pathname = usePathname();

  let classNameProps = className;

  // Apply active styles if current pathname matches href
  if (pathname === href) {
    const activeClass =
      activeLinkClass ||
      "text-primary bg-background border-b-2 border-primary ease-in-out duration-200";
    classNameProps = `${className} ${activeClass}`;
  }

  return (
    <Link href={href} prefetch={false} className={classNameProps}>
      {children}
    </Link>
  );
}
