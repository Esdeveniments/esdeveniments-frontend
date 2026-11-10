"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { EllipsisHorizontalIcon, PhotoIcon } from "@heroicons/react/24/outline";
import { FacebookLegacyIcon, WhatsappLegacyIcon } from "react-share";
import Button from "@components/ui/common/button";
import Thumbnail from "@components/ui/common/image/Thumbnail";
import { siteUrl } from "@config/index";
import { sendGoogleEvent } from "@utils/analytics";
import { getSanitizedErrorMessage } from "@utils/api-error-handler";
import {
  buildFacebookShareHref,
  buildShareText,
  buildShareUrl,
  buildWhatsappShareHref,
  isShareAbort,
} from "@utils/share-kit";
import type { ShareKitChannel } from "types/event";
import type { ShareKitProps } from "types/props";

const SITE_LABEL = new URL(siteUrl).hostname.replace(/^www\./, "");
// Round tiles with the label underneath, like a phone's share sheet.
const TILE_CLASS =
  "flex-center-col gap-1.5 w-20 rounded-card py-2 body-small text-foreground hover:bg-muted transition-colors focus-ring disabled:opacity-50";
const TILE_ICON_CLASS = "flex-center w-14 h-14 rounded-full bg-muted text-foreground-strong";
const BRAND_ICON_PROPS = { size: 56, round: true, "aria-hidden": true } as const;

/**
 * Organiser share actions, modelled on Luma's and Meetup's share modals: event
 * preview, one tap per channel, and the link with a copy button. Every link
 * carries UTMs so GA can count the visits each share brings.
 */
export default function ShareKit({ event, source, description }: ShareKitProps) {
  const t = useTranslations("Components.ShareKit");
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [imageState, setImageState] = useState<"idle" | "loading" | "error">("idle");
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Only rendered inside a client-only modal, so navigator is always defined.
  const canNativeShare = typeof navigator.share === "function";
  const displayUrl = event.url.replace(/^https?:\/\/(www\.)?/, "");

  const track = (method: ShareKitChannel) =>
    sendGoogleEvent("share", { method, content_type: "event", item_id: event.slug, source });
  const trackError = (method: ShareKitChannel, error: unknown) =>
    sendGoogleEvent("share_error", {
      method,
      content_type: "event",
      item_id: event.slug,
      source,
      error: getSanitizedErrorMessage(error),
    });

  const brandLinks = [
    {
      channel: "whatsapp",
      label: "WhatsApp",
      Icon: WhatsappLegacyIcon,
      href: buildWhatsappShareHref(
        buildShareText(event, buildShareUrl(event.url, "whatsapp", source)),
      ),
    },
    {
      channel: "facebook",
      label: "Facebook",
      Icon: FacebookLegacyIcon,
      href: buildFacebookShareHref(buildShareUrl(event.url, "facebook", source)),
    },
  ] as const;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildShareUrl(event.url, "copy", source));
      setCopyFailed(false);
      setCopied(true);
      track("copy");
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      setCopyFailed(true);
      trackError("copy", error);
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: event.title,
        text: buildShareText(event),
        url: buildShareUrl(event.url, "native", source),
      });
      track("native");
    } catch (error) {
      if (!isShareAbort(error)) trackError("native", error);
    }
  };

  const handleImage = async () => {
    setImageState("loading");
    try {
      const { renderEventFlyer } = await import("@utils/event-flyer");
      const blob = await renderEventFlyer(event, SITE_LABEL);
      const file = new File([blob], `${event.slug || "esdeveniment"}.png`, { type: "image/png" });
      // Phones get the share sheet (Instagram, WhatsApp); desktops a download.
      const isTouch = window.matchMedia("(pointer: coarse)").matches;
      let handled = false;
      if (isTouch && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: event.title });
          track("image_share");
          handled = true;
        } catch (error) {
          // A slow render can expire the tap's user activation
          // (NotAllowedError); the poster exists, so download it instead.
          handled = isShareAbort(error);
          if (!handled) trackError("image_share", error);
        }
      }
      if (!handled) {
        const href = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = href;
        link.download = file.name;
        link.click();
        setTimeout(() => URL.revokeObjectURL(href), 1000);
        track("image_download");
      }
      setImageState("idle");
    } catch (error) {
      setImageState("error");
      trackError("image_download", error);
    }
  };

  const meta = [event.dateText, event.placeText].filter(Boolean).join(" · ");

  return (
    <div className="stack" data-testid="share-kit">
      <div className="card-bordered flex items-center gap-3 p-3">
        <Thumbnail image={event.imageUrl ?? undefined} label={event.title} />
        <div className="min-w-0 text-left">
          <p className="body-normal font-medium text-foreground-strong line-clamp-2">
            {event.title}
          </p>
          {meta && <p className="body-small text-muted-foreground truncate">{meta}</p>}
        </div>
      </div>

      {description && (
        <p className="body-normal text-muted-foreground text-center">{description}</p>
      )}

      <div className="flex justify-center gap-1">
        {brandLinks.map(({ channel, href, label, Icon }) => (
          <a
            key={channel}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={TILE_CLASS}
            aria-label={t(channel)}
            onClick={() => track(channel)}
            data-testid={`share-kit-${channel}`}
          >
            <Icon {...BRAND_ICON_PROPS} />
            {label}
          </a>
        ))}
        <button
          type="button"
          className={TILE_CLASS}
          onClick={handleImage}
          disabled={imageState === "loading"}
          title={t("imageTitle")}
          data-testid="share-kit-image"
        >
          <span className={TILE_ICON_CLASS}>
            <PhotoIcon className="w-7 h-7" aria-hidden="true" />
          </span>
          {imageState === "loading" ? t("imageLoading") : t("image")}
        </button>
        {canNativeShare && (
          <button
            type="button"
            className={TILE_CLASS}
            onClick={handleNativeShare}
            data-testid="share-kit-native"
          >
            <span className={TILE_ICON_CLASS}>
              <EllipsisHorizontalIcon className="w-7 h-7" aria-hidden="true" />
            </span>
            {t("more")}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-input border border-input bg-muted p-1 pl-3">
        <span className="flex-1 min-w-0 truncate body-small text-muted-foreground" title={event.url}>
          {displayUrl}
        </span>
        <Button
          type="button"
          variant="primary"
          className="btn-sm shrink-0"
          onClick={handleCopy}
          aria-label={t("copyLinkLabel")}
          data-testid="share-kit-copy"
        >
          <span aria-live="polite">{copied ? t("copied") : t("copyLink")}</span>
        </Button>
      </div>

      {(imageState === "error" || copyFailed) && (
        <p role="alert" className="body-small text-error-dark text-center">
          {imageState === "error" ? t("imageError") : t("copyError")}
        </p>
      )}
    </div>
  );
}
