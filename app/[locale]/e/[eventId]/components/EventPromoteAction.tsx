"use client";

import { useTranslations } from "next-intl";
import { Link } from "@i18n/routing";
import { MegaphoneIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@components/hooks/useAuth";
import type { EventPromoteActionProps } from "types/props";

/**
 * Owner-only promote link for the event detail sidebar. Client-side check
 * (not a server-side getCurrentUser() call) so a page view doesn't pay for
 * a backend enrichment round-trip just to decide whether to show this link —
 * mirrors EventEditAction exactly.
 */
export default function EventPromoteAction({
  ownerId,
  slug,
}: EventPromoteActionProps) {
  const { user } = useAuth();
  const t = useTranslations("Components.EventPage");

  if (!ownerId || user?.id !== ownerId) return null;

  return (
    <Link
      href={`/e/${slug}/promote`}
      className="inline-flex items-center gap-2 btn-outline btn-sm"
      data-testid="event-promote-link"
    >
      <MegaphoneIcon className="w-4 h-4" aria-hidden="true" />
      {t("promoteEvent")}
    </Link>
  );
}
