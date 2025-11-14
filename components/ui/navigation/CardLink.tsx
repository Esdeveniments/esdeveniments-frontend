"use client";

import { PendingLink } from "./PendingLink";
import type { PendingLinkProps } from "types/common";

/**
 * CardLink - A lightweight wrapper around PendingLink for card components.
 *
 * This component allows server-rendered card components to use navigation progress
 * feedback without making the entire card a client component. Only the anchor element
 * becomes client-side, preserving SEO benefits (server-rendered HTML with proper
 * anchor tags) while adding minimal JavaScript overhead.
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
export function CardLink(props: PendingLinkProps) {
  return <PendingLink {...props} />;
}

