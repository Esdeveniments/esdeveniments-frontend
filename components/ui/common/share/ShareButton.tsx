"use client";

import { useCallback, useId, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { ShareIcon } from "@heroicons/react/24/outline";
import Button from "@components/ui/common/button";
import { getShareItemId, sendGoogleEvent } from "@utils/analytics";
import { isShareAbort } from "@utils/share-kit";
import type { ShareButtonProps } from "types/props";

// Phones use the system share sheet; the desktop menu loads on first click.
const ShareMenu = dynamic(() => import("./ShareMenu"), { ssr: false });

export default function ShareButton({ target, contentType }: ShareButtonProps) {
  const t = useTranslations("Components.ShareKit");
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const trackShare = useCallback(
    (method: string) =>
      sendGoogleEvent("share", {
        method,
        content_type: contentType,
        item_id: getShareItemId(target.url),
      }),
    [contentType, target.url],
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
          title: target.title,
          text: target.text,
          url: target.url,
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
        aria-label={t("shareLabel", { title: target.title })}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={handleClick}
      >
        <ShareIcon className="h-6 w-6 text-foreground-strong" aria-hidden="true" />
      </Button>
      {open && (
        <ShareMenu
          id={menuId}
          target={target}
          onClose={closeMenu}
          onShared={trackShare}
        />
      )}
    </div>
  );
}
