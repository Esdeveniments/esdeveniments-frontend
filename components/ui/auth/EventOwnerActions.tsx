"use client";

import { useAuth } from "@components/hooks/useAuth";
import { Link } from "@i18n/routing";
import { useTranslations } from "next-intl";
import type { EventOwnerActionsProps } from "types/props";

export default function EventOwnerActions({
  eventSlug,
  eventCreatorId,
  eventProfileSlug,
}: EventOwnerActionsProps) {
  const { user, isAuthenticated } = useAuth();
  const t = useTranslations("Auth");

  if (!isAuthenticated || !user) return null;

  const isCreator = eventCreatorId && user.id === eventCreatorId;
  const isProfileOwner =
    eventProfileSlug &&
    user.role === "organizer" &&
    user.profileSlug === eventProfileSlug;

  if (!isCreator && !isProfileOwner) return null;

  return (
    <Link
      href={`/e/${eventSlug}/edita` as `/${string}`}
      className="btn-outline text-sm inline-flex items-center gap-1"
      data-testid="event-edit-link"
    >
      {t("editEvent")}
    </Link>
  );
}
