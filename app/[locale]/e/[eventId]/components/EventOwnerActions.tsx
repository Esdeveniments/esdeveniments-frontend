"use client";

import { useTranslations } from "next-intl";
import { Link } from "@i18n/routing";
import { MegaphoneIcon, PencilIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@components/hooks/useAuth";
import { canManageEvent, isEventOwner } from "@utils/event-helpers";
import EventDeleteAction from "./EventDeleteAction";
import type { EventOwnerActionsProps } from "types/props";

/**
 * Edit and delete for the event's creator or an admin; promote for the creator
 * only (it starts a payment). The check runs on the client with the session
 * AuthProvider already loaded, so a page view makes no extra backend call. The
 * server checks again on each action.
 */
export default function EventOwnerActions({ ownerId, slug }: EventOwnerActionsProps) {
  const { user } = useAuth();
  const t = useTranslations("Components.EventPage");

  if (!canManageEvent(user, ownerId)) return null;

  return (
    <>
      <Link href={`/e/${slug}/edita`} className="btn-outline" data-testid="event-edit-link">
        <PencilIcon className="w-4 h-4" aria-hidden="true" />
        {t("editEvent")}
      </Link>
      {isEventOwner(user?.id, ownerId) && (
        <Link href={`/e/${slug}/promote`} className="btn-outline" data-testid="event-promote-link">
          <MegaphoneIcon className="w-4 h-4" aria-hidden="true" />
          {t("promoteEvent")}
        </Link>
      )}
      <EventDeleteAction slug={slug} />
    </>
  );
}
