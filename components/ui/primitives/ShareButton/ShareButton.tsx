"use client";

import { JSX, useCallback, useMemo, memo } from "react";
import { siteUrl } from "@config/index";
import useCheckMobileScreen from "@components/hooks/useCheckMobileScreen";
import { sendGoogleEvent } from "@utils/analytics";
import {
  FacebookShareButton,
  TwitterShareButton,
  TelegramShareButton,
  WhatsappShareButton,
  FacebookIcon,
  TelegramIcon,
  WhatsappIcon,
} from "react-share";
import { ShareIcon } from "@heroicons/react/outline";
import type { ShareButtonProps, CustomIconProps } from "types/common";
import { Text } from "@components/ui/primitives/Text";

const ShareButton = ({
  slug,
  strategy = "auto",
  title = "",
  description = "",
  date = "",
  location = "",
  subLocation = "",
  onShareClick,
  hideText = false,
  compact = true,
}: ShareButtonProps): JSX.Element | null => {
  const isMobile = useCheckMobileScreen();
  const eventUrl = `${siteUrl}/e/${slug}`;

  // Determine which strategy to use based on device capabilities and preference
  const actualStrategy = useMemo(() => {
    if (strategy !== "auto") return strategy;

    // Auto mode: prefer native on mobile if available, otherwise social
    if (isMobile && typeof navigator !== "undefined" && "share" in navigator) {
      return "native";
    }
    return "social";
  }, [strategy, isMobile]);

  // Create rich share text for native sharing
  const shareText = useMemo(() => {
    let content = title || "";

    if (description) {
      content += `\n\n${description}`;
    }

    if (date) {
      content += `\n\nData: ${date}`;
    }

    if (location) {
      content += `\nLloc: ${location}`;
      if (subLocation) {
        content += `, ${subLocation}`;
      }
    }

    return content.trim();
  }, [title, description, date, location, subLocation]);

  // Handle native sharing
  const handleNativeShare = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();

      if (onShareClick) {
        onShareClick(e);
      }

      if (navigator.share) {
        try {
          await navigator.share({
            title: title || "Esdeveniment",
            text: shareText,
            url: eventUrl,
          });
          sendGoogleEvent("share", {
            method: "native",
            content: title || slug,
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
    [onShareClick, title, shareText, eventUrl, slug],
  );

  // Social media sharing component
  const SocialShareButtons = () => {
    const iconProps: CustomIconProps = {
      bgStyle: { fill: "#FFF" },
      iconFillColor: "#454545",
      size: 27,
      round: true,
    };

    return (
      <div className="flex h-8 w-full items-center justify-start gap-component-md">
        <TelegramShareButton url={eventUrl} aria-label="Telegram">
          <TelegramIcon {...iconProps} className="mr-[8px]" />
        </TelegramShareButton>

        <WhatsappShareButton url={eventUrl} aria-label="Whatsapp">
          <WhatsappIcon {...iconProps} className="mr-xs" />
        </WhatsappShareButton>

        <FacebookShareButton url={eventUrl} aria-label="Facebook">
          <FacebookIcon {...iconProps} size={31} />
        </FacebookShareButton>

        <TwitterShareButton url={eventUrl}>
          <svg
            className="h-5 w-7 fill-blackCorp"
            role="img"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512"
            aria-label="Twitter"
          >
            <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z" />
          </svg>
        </TwitterShareButton>
      </div>
    );
  };

  // Static sharing component (direct app links)
  const StaticShareButtons = () => {
    const encodedUrl = encodeURIComponent(eventUrl);
    const encodedShareText = encodeURIComponent(shareText);
    const encodedTitle = encodeURIComponent(title || "Esdeveniment");

    const shareUrls = {
      whatsapp: `https://wa.me/?text=${encodedShareText}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      sms: `sms:?body=${encodedShareText}`,
      email: `mailto:?subject=${encodedTitle}&body=${encodedShareText}`,
    };

    if (compact) {
      return (
        <div className="flex items-center gap-component-xs">
          <a
            href={shareUrls.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Compartir a WhatsApp"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-whiteCorp transition-opacity hover:opacity-80"
          >
            <svg className="h-4 w-4 fill-[#25D366]" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.89 3.488" />
            </svg>
          </a>

          <a
            href={shareUrls.sms}
            aria-label="Compartir per SMS"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-whiteCorp transition-opacity hover:opacity-80"
          >
            <svg className="h-4 w-4 fill-gray-600" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
            </svg>
          </a>

          <a
            href={shareUrls.email}
            aria-label="Compartir per email"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-whiteCorp transition-opacity hover:opacity-80"
          >
            <svg className="h-4 w-4 fill-gray-600" viewBox="0 0 24 24">
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
            </svg>
          </a>

          <a
            href={shareUrls.telegram}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Compartir a Telegram"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-whiteCorp transition-opacity hover:opacity-80"
          >
            <svg className="h-4 w-4 fill-[#0088cc]" viewBox="0 0 24 24">
              <path d="M18.384 22.779a1.19 1.19 0 0 0 1.107.145 1.16 1.16 0 0 0 .724-.84C21.084 18 23.192 7.663 23.983 3.948a.78.78 0 0 0-.26-.758.8.8 0 0 0-.797-.14C18.733 4.602 5.82 9.447.542 11.4a.827.827 0 0 0-.542.799c.012.354.25.661.593.764 2.367.708 5.474 1.693 5.474 1.693s1.452 4.385 2.209 6.615c.095.28.314.5.603.576a.866.866 0 0 0 .811-.207l3.096-2.923s3.572 2.619 5.598 4.062z" />
            </svg>
          </a>
        </div>
      );
    }

    return (
      <div className="grid w-full grid-cols-2 gap-component-xs">
        <a
          href={shareUrls.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:bg-green-100 flex items-center gap-component-xs rounded-lg bg-success/10 p-component-xs transition-colors"
        >
          <svg className="h-5 w-5 fill-[#25D366]" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.89 3.488" />
          </svg>
          <Text variant="body-sm">WhatsApp</Text>
        </a>

        <a
          href={shareUrls.sms}
          className="hover:bg-blue-100 flex items-center gap-component-xs rounded-lg bg-primary/10 p-component-xs transition-colors"
        >
          <svg className="fill-blue-600 h-5 w-5" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
          </svg>
          <Text variant="body-sm">SMS</Text>
        </a>

        <a
          href={shareUrls.email}
          className="flex items-center gap-component-xs rounded-lg bg-whiteCorp p-component-xs transition-colors hover:bg-darkCorp"
        >
          <svg className="h-5 w-5 fill-gray-600" viewBox="0 0 24 24">
            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
          </svg>
          <Text variant="body-sm">Email</Text>
        </a>

        <a
          href={shareUrls.telegram}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:bg-blue-100 flex items-center gap-component-xs rounded-lg bg-primary/10 p-component-xs transition-colors"
        >
          <svg className="h-5 w-5 fill-[#0088cc]" viewBox="0 0 24 24">
            <path d="M18.384 22.779a1.19 1.19 0 0 0 1.107.145 1.16 1.16 0 0 0 .724-.84C21.084 18 23.192 7.663 23.983 3.948a.78.78 0 0 0-.26-.758.8.8 0 0 0-.797-.14C18.733 4.602 5.82 9.447.542 11.4a.827.827 0 0 0-.542.799c.012.354.25.661.593.764 2.367.708 5.474 1.693 5.474 1.693s1.452 4.385 2.209 6.615c.095.28.314.5.603.576a.866.866 0 0 0 .811-.207l3.096-2.923s3.572 2.619 5.598 4.062z" />
          </svg>
          <Text variant="body-sm">Telegram</Text>
        </a>
      </div>
    );
  };

  // Render based on strategy
  switch (actualStrategy) {
    case "native":
      // Only show native share on mobile with support
      if (!isMobile || !navigator.share) return null;
      return (
        <button
          onClick={handleNativeShare}
          className="hover:text-primary-dark flex items-center text-primary transition-colors duration-200"
          aria-label={`Compartir ${title || "esdeveniment"}`}
          title="Compartir"
        >
          <ShareIcon className="h-6 w-6" />
          {!hideText && (
            <Text
              as="p"
              variant="body"
              className="ml-component-xs hover:underline"
            >
              Compartir
            </Text>
          )}
        </button>
      );

    case "social":
      return <SocialShareButtons />;

    case "static":
      return <StaticShareButtons />;

    default:
      return null;
  }
};

export default memo(ShareButton);
