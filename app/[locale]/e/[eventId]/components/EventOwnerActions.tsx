"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Link } from "@i18n/routing";
import { MegaphoneIcon, PencilIcon, ShareIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@components/hooks/useAuth";
import Button from "@components/ui/common/button";
import { isEventOwner } from "@utils/event-helpers";
import EventDeleteAction from "./EventDeleteAction";
import type { EventOwnerActionsProps } from "types/props";

// Only owners open it, so keep it out of the event page bundle.
const ShareKitModal = dynamic(() => import("@components/ui/shareKit/ShareKitModal"), {
  ssr: false,
});

/**
 * Share, edit, promote and delete, shown only to the event's creator. The check runs
 * on the client with the session AuthProvider already loaded, so a page view
 * makes no extra backend call. The server checks ownership again on each action.
 */
export default function EventOwnerActions({ ownerId, slug, shareEvent }: EventOwnerActionsProps) {
  const { user } = useAuth();
  const t = useTranslations("Components.EventPage");
  const [shareOpen, setShareOpen] = useState(false);

  if (!isEventOwner(user?.id, ownerId)) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setShareOpen(true)}
        data-testid="event-share-kit-button"
      >
        <ShareIcon className="w-4 h-4" aria-hidden="true" />
        {t("shareEvent")}
      </Button>
      {shareOpen && (
        <ShareKitModal
          open={shareOpen}
          setOpen={setShareOpen}
          event={shareEvent}
          source="owner_actions"
        />
      )}
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
