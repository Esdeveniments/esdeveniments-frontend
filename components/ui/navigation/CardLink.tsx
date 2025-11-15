import Link from "next/link";
import type { LinkProps } from "next/link";
import type { ReactNode } from "react";

/**
 * CardLink - A lightweight wrapper around Next.js Link for card components.
 *
 * NOTE: Navigation progress is now handled globally via useGlobalNavigation.
 * This component is now just a regular Link - no client-side overhead!
 * The progress bar will still show automatically on click.
 *
 * Usage in server components:
 * import { CardLink } from "@components/ui/navigation/CardLink";
 * export default function MyCard() {
 *   return (
 *     <CardLink href="/e/event-slug" className="...">
 *       Card content
 *     </CardLink>
 *   );
 * }
 */
export function CardLink({
  children,
  ...props
}: LinkProps & { children: ReactNode; className?: string }) {
  return <Link {...props}>{children}</Link>;
}

