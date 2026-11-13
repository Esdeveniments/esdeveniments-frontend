"use client";

import { useCallback, useMemo, memo, MouseEvent, JSX } from "react";
import { ShareIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import useCheckMobileScreen from "@components/hooks/useCheckMobileScreen";
import { getShareItemId, sendGoogleEvent } from "@utils/analytics";
import { NativeShareButtonProps } from "../../../../types/props";
import { getSanitizedErrorMessage } from "@utils/api-error-handler";
import { isShareAbort } from "@utils/share-kit";

const NativeShareButton = ({
  title,
  text,
  url,
  date,
  location,
  subLocation,
  onShareClick,
  hideText = false,
}: NativeShareButtonProps): JSX.Element | null => {
  const isMobile = useCheckMobileScreen();
  const t = useTranslations("Components.ShareKit");

  const shareText = useMemo(() => {
    const place = [location, subLocation].filter(Boolean).join(", ");
    return [
      title,
      text ? `\n${text}` : "",
      `\n${t("shareDate", { date })}`,
      place ? t("sharePlace", { place }) : "",
    ]
      .filter(Boolean)
      .join("\n")
      .trim();
  }, [t, title, text, date, location, subLocation]);

  const handleNativeShare = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();

      if (onShareClick) {
        onShareClick(e);
      }

      if (navigator.share) {
        try {
          await navigator.share({
            title,
            text: shareText,
            url,
          });
          sendGoogleEvent("share", {
            method: "native",
            content_type: "event",
            item_id: getShareItemId(url),
          });
        } catch (error) {
          // Closing the share sheet is not an error.
          if (isShareAbort(error)) return;
          console.error("Error sharing:", error);
          sendGoogleEvent("share_error", {
            method: "native",
            error: getSanitizedErrorMessage(error),
          });
        }
      }
    },
    [onShareClick, title, shareText, url]
  );

  if (!isMobile || !navigator.share) {
    return null;
  }

  return (
    <button
      onClick={handleNativeShare}
      className="flex items-center text-primary hover:text-primary-dark transition-colors duration-200"
      aria-label={t("shareLabel", { title })}
      title={t("share")}
    >
      <ShareIcon className="h-6 w-6" />
      {!hideText && (
        <p className="text-foreground-strong ml-2 hover:underline">{t("share")}</p>
      )}
    </button>
  );
};

export default memo(NativeShareButton);
