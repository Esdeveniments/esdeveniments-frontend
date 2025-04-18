import { useCallback, useMemo, memo, MouseEvent, JSX } from "react";
import { ShareIcon } from "@heroicons/react/outline";
import useCheckMobileScreen from "@components/hooks/useCheckMobileScreen";
import { sendGoogleEvent } from "@utils/analytics";

interface NativeShareButtonProps {
  title: string;
  url: string;
  date: string;
  location: string;
  subLocation?: string;
  // eslint-disable-next-line no-unused-vars
  onShareClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  hideText?: boolean;
}

const NativeShareButton = ({
  title,
  url,
  date,
  location,
  subLocation,
  onShareClick,
  hideText = false,
}: NativeShareButtonProps): JSX.Element | null => {
  const isMobile = useCheckMobileScreen();

  const shareText = useMemo(
    () =>
      `
${title}

Data: ${date}
Lloc: ${location}, ${subLocation}
  `.trim(),
    [title, date, location, subLocation]
  );

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
            error: error instanceof Error ? error.message : String(error),
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
        <p className="text-blackCorp ml-2 hover:underline">Compartir</p>
      )}
    </button>
  );
};

export default memo(NativeShareButton);
