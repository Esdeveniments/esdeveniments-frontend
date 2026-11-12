"use client";

import { useId, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import {
  EllipsisHorizontalIcon,
  MegaphoneIcon,
  PencilIcon,
  ShareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { Link } from "@i18n/routing";
import Button from "@components/ui/common/button";
import EventDeleteDialog from "./EventDeleteDialog";
import type { EventOwnerToolsProps } from "types/props";

// Only owners open it, so keep it out of the event page bundle.
const ShareKitModal = dynamic(() => import("@components/ui/shareKit/ShareKitModal"), {
  ssr: false,
});

/**
 * Host tools under the event title: edit is the main action, share and promote
 * stay visible, and delete sits behind "More actions" so it can't be hit by
 * mistake (Luma, Partiful). `EventOwnerBar` loads it only for the owner.
 */
export default function EventOwnerTools({ slug, shareEvent }: EventOwnerToolsProps) {
  const t = useTranslations("Components.EventPage");
  const titleId = useId();
  const [shareOpen, setShareOpen] = useState(false);
  // Lives here, not in the menu: Headless UI unmounts the items when it closes.
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <section
      aria-labelledby={titleId}
      className="card-bordered p-card-padding stack"
      data-testid="event-owner-bar"
    >
      <h2 id={titleId} className="body-small font-semibold text-foreground-strong">
        {t("ownerBarTitle")}
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/e/${slug}/edita`}
          className="btn-primary btn-sm"
          data-testid="event-edit-link"
        >
          <PencilIcon className="w-4 h-4" aria-hidden="true" />
          {t("editEvent")}
        </Link>
        <Button
          type="button"
          variant="neutral"
          className="btn-sm"
          onClick={() => setShareOpen(true)}
          data-testid="event-share-kit-button"
        >
          <ShareIcon className="w-4 h-4" aria-hidden="true" />
          {t("shareEvent")}
        </Button>
        <Link
          href={`/e/${slug}/promote`}
          className="btn-neutral btn-sm"
          data-testid="event-promote-link"
        >
          <MegaphoneIcon className="w-4 h-4" aria-hidden="true" />
          {t("promoteEvent")}
        </Link>
        <Menu>
          <MenuButton
            className="btn-neutral btn-sm px-2"
            aria-label={t("moreActions")}
            data-testid="event-owner-more-button"
          >
            <EllipsisHorizontalIcon className="w-5 h-5" aria-hidden="true" />
          </MenuButton>
          <MenuItems
            anchor={{ to: "bottom end", gap: 4, padding: 8 }}
            className="z-50 w-56 card-elevated p-1 focus:outline-none"
          >
            <MenuItem>
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="flex w-full items-center gap-2 rounded-input px-3 py-2 body-small text-error-dark data-[focus]:bg-muted"
                data-testid="event-delete-button"
              >
                <TrashIcon className="w-4 h-4" aria-hidden="true" />
                {t("deleteEvent")}
              </button>
            </MenuItem>
          </MenuItems>
        </Menu>
      </div>
      {shareOpen && (
        <ShareKitModal
          open={shareOpen}
          setOpen={setShareOpen}
          event={shareEvent}
          source="owner_actions"
        />
      )}
      <EventDeleteDialog slug={slug} open={deleteOpen} setOpen={setDeleteOpen} />
    </section>
  );
}
