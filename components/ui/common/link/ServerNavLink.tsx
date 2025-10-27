import Link from "next/link";
import { headers } from "next/headers";
import { ServerNavLinkProps } from "types/props";

// Server-safe navigation link component with active state detection
export default async function ServerNavLink({
  href,
  children,
  className = "flex justify-center items-center gap-2 text-foreground-strong bg-background py-2 px-3 label ease-in-out duration-200",
  activeLinkClass,
}: ServerNavLinkProps) {
  // Get the current pathname from headers on the server
  const headersList = await headers();
  const pathname =
    headersList.get("x-pathname") || headersList.get("x-url") || "";

  let classNameProps = className;

  // Apply active styles if current pathname matches href
  if (pathname === href) {
    const activeClass =
      activeLinkClass ||
      "text-primary bg-background border-b-2 border-primary ease-in-out duration-200";
    classNameProps = `${activeClass} ${className}`;
  }

  return (
    <Link href={href} prefetch={false} className={classNameProps}>
      {children}
    </Link>
  );
}
