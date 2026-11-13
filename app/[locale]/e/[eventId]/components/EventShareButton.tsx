"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { ShareIcon } from "@heroicons/react/24/outline";
import Button from "@components/ui/common/button";
import { getShareItemId, sendGoogleEvent } from "@utils/analytics";
import { buildShareText, isShareAbort } from "@utils/share-kit";
import type { EventShareButtonProps } from "types/props";

// Phones use the system share sheet; the desktop menu loads on first click.
const EventShareMenu = dynamic(() => import("./EventShareMenu"), { ssr: false });

const MENU_ID = "event-share-menu";

export default function EventShareButton({ shareEvent }: EventShareButtonProps) {
  const t = useTranslations("Components.ShareKit");
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const trackShare = useCallback(
    (method: string) =>
      sendGoogleEvent("share", {
        method,
        content_type: "event",
        item_id: getShareItemId(shareEvent.url),
      }),
    [shareEvent.url],
  );

  const closeMenu = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  const handleClick = async () => {
    // Desktop share dialogs (Windows, macOS) are a worse fit than a short menu.
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (isTouch && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: shareEvent.title,
          text: buildShareText(shareEvent),
          url: shareEvent.url,
        });
        trackShare("native");
      } catch (error) {
        if (!isShareAbort(error)) setOpen(true);
      }
      return;
    }
    setOpen((value) => !value);
  };

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        type="button"
        variant="ghost"
        className="h-button w-button p-0"
        aria-label={t("shareLabel", { title: shareEvent.title })}
        aria-expanded={open}
        aria-controls={open ? MENU_ID : undefined}
        onClick={handleClick}
      >
        <ShareIcon className="h-6 w-6 text-foreground-strong" aria-hidden="true" />
      </Button>
      {open && (
        <EventShareMenu
          id={MENU_ID}
          shareEvent={shareEvent}
          onClose={closeMenu}
          onShared={trackShare}
        />
      )}
    </div>
  );
}
