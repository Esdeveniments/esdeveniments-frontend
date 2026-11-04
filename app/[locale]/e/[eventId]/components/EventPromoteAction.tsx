"use client";

import { useTranslations } from "next-intl";
import { Link } from "@i18n/routing";
import { MegaphoneIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@components/hooks/useAuth";
import type { EventPromoteActionProps } from "types/props";

/** Owner-only promote link. Client-side check, same as EventEditAction. */
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
      className="btn-outline"
      data-testid="event-promote-link"
    >
      <MegaphoneIcon className="w-4 h-4" aria-hidden="true" />
      {t("promoteEvent")}
    </Link>
  );
}
