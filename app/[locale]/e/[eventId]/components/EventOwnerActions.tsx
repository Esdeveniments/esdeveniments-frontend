"use client";

import { useTranslations } from "next-intl";
import { Link } from "@i18n/routing";
import { MegaphoneIcon, PencilIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@components/hooks/useAuth";
import { isEventOwner } from "@utils/event-helpers";
import EventDeleteAction from "./EventDeleteAction";
import type { EventOwnerActionsProps } from "types/props";

/**
 * Edit, promote and delete, shown only to the event's creator. The check runs
 * on the client with the session AuthProvider already loaded, so a page view
 * makes no extra backend call. The server checks ownership again on each action.
 */
export default function EventOwnerActions({ ownerId, slug }: EventOwnerActionsProps) {
  const { user } = useAuth();
  const t = useTranslations("Components.EventPage");

  if (!isEventOwner(user?.id, ownerId)) return null;

  return (
    <>
      <Link href={`/e/${slug}/edita`} className="btn-outline" data-testid="event-edit-link">
        <PencilIcon className="w-4 h-4" aria-hidden="true" />
        {t("editEvent")}
      </Link>
      <Link href={`/e/${slug}/promote`} className="btn-outline" data-testid="event-promote-link">
        <MegaphoneIcon className="w-4 h-4" aria-hidden="true" />
        {t("promoteEvent")}
      </Link>
      <EventDeleteAction slug={slug} />
    </>
  );
}
