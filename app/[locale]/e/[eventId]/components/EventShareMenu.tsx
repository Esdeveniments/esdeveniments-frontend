"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  EllipsisHorizontalIcon,
  EnvelopeIcon,
  LinkIcon,
} from "@heroicons/react/24/outline";
import { WhatsappLegacyIcon } from "react-share";
import { buildShareText, buildWhatsappShareHref, isShareAbort } from "@utils/share-kit";
import type { EventShareMenuProps } from "types/props";

const itemClassName =
  "flex w-full items-center gap-element-gap rounded-input px-3 min-h-button body-small text-foreground-strong hover:bg-muted focus-visible:bg-muted transition-interactive";
const iconClassName = "h-5 w-5 flex-shrink-0 text-muted-foreground";

/** Desktop share menu: copy link first (the most common desktop share), then chat and email. */
export default function EventShareMenu({ id, shareEvent, onClose, onShared }: EventShareMenuProps) {
  const t = useTranslations("Components.ShareKit");
  const ref = useRef<HTMLDivElement>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const shareText = buildShareText(shareEvent, shareEvent.url);

  useEffect(() => {
    const container = ref.current;
    container?.querySelector<HTMLElement>("button, a")?.focus();
    // The trigger shares the parent: clicking it toggles instead of closing twice.
    const handlePointer = (event: PointerEvent) => {
      if (!container?.parentElement?.contains(event.target as Node)) onClose();
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareEvent.url);
      setCopyState("copied");
      onShared("copy");
    } catch {
      // Some in-app browsers block the clipboard: show the link to copy by hand.
      setCopyState("error");
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({
        title: shareEvent.title,
        text: buildShareText(shareEvent),
        url: shareEvent.url,
      });
      onShared("native");
      onClose();
    } catch (error) {
      if (!isShareAbort(error)) setCopyState("error");
    }
  };

  const mailto = `mailto:?subject=${encodeURIComponent(shareEvent.title)}&body=${encodeURIComponent(shareText)}`;

  return (
    <div
      ref={ref}
      id={id}
      className="absolute right-0 top-full z-30 mt-2 w-64 origin-top-right animate-appear card-elevated bg-background p-2 flex flex-col"
    >
      <button type="button" className={itemClassName} onClick={copyLink}>
        <LinkIcon className={iconClassName} aria-hidden="true" />
        <span aria-live="polite">{copyState === "copied" ? t("copied") : t("copyLinkLabel")}</span>
      </button>
      {copyState === "error" && (
        <div className="px-3 py-2 flex flex-col gap-1">
          <p className="body-small text-error-dark">{t("copyError")}</p>
          <input
            readOnly
            value={shareEvent.url}
            aria-label={t("copyLinkLabel")}
            onFocus={(event) => event.currentTarget.select()}
            className="w-full rounded-input border border-input px-2 py-1 body-small"
          />
        </div>
      )}
      <a
        href={buildWhatsappShareHref(shareText)}
        target="_blank"
        rel="noopener noreferrer"
        className={itemClassName}
        onClick={() => {
          onShared("whatsapp");
          onClose();
        }}
      >
        <WhatsappLegacyIcon size={20} round aria-hidden className="flex-shrink-0" />
        {t("whatsapp")}
      </a>
      <a
        href={mailto}
        className={itemClassName}
        onClick={() => {
          onShared("email");
          onClose();
        }}
      >
        <EnvelopeIcon className={iconClassName} aria-hidden="true" />
        {t("email")}
      </a>
      {canNativeShare && (
        <button type="button" className={itemClassName} onClick={nativeShare}>
          <EllipsisHorizontalIcon className={iconClassName} aria-hidden="true" />
          {t("moreOptions")}
        </button>
      )}
    </div>
  );
}
