"use client";

import { useCallback, useMemo, memo, MouseEvent, JSX } from "react";
import ShareIcon from "@heroicons/react/outline/esm/ShareIcon";
import useCheckMobileScreen from "@components/hooks/useCheckMobileScreen";
import { sendGoogleEvent } from "@utils/analytics";
import { NativeShareButtonProps } from "../../../../types/props";
import { getSanitizedErrorMessage } from "@utils/api-error-handler";

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

  const shareText = useMemo(() => {
    let content = `${title}`;

    if (text) {
      content += `\n\n${text}`;
    }

    content += `\n\nData: ${date}`;
    content += `\nLloc: ${location}, ${subLocation}`;

    return content.trim();
  }, [title, text, date, location, subLocation]);

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
            content: title,
          });
        } catch (error) {
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
      aria-label={`Compartir ${title}`}
      title="Compartir"
    >
      <ShareIcon className="h-6 w-6" />
      {!hideText && (
        <p className="text-foreground-strong ml-2 hover:underline">Compartir</p>
      )}
    </button>
  );
};

export default memo(NativeShareButton);
