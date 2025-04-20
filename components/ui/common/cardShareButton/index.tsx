import { siteUrl } from "@config/index";
import { JSX } from "react";
import {
  FacebookShareButton,
  TwitterShareButton,
  TelegramShareButton,
  WhatsappShareButton,
  FacebookIcon,
  TelegramIcon,
  WhatsappIcon,
} from "react-share";
import type { CardShareButtonProps, CustomIconProps } from "types/common";

export default function CardShareButton({
  slug,
}: CardShareButtonProps): JSX.Element {
  const eventUrl = `${siteUrl}/e/${slug}`;

  const iconProps: CustomIconProps = {
    bgStyle: { fill: "#FFF" },
    iconFillColor: "#454545",
    size: 27,
    round: true,
  };

  return (
    <div className="w-full h-8 flex justify-start items-center gap-4">
      <TelegramShareButton url={eventUrl} aria-label="Telegram">
        <TelegramIcon {...iconProps} className="mr-[10px]" />
      </TelegramShareButton>

      <WhatsappShareButton url={eventUrl} aria-label="Whatsapp">
        <WhatsappIcon {...iconProps} className="mr-1" />
      </WhatsappShareButton>

      <FacebookShareButton url={eventUrl} aria-label="Facebook">
        <FacebookIcon {...iconProps} size={31} />
      </FacebookShareButton>

      <TwitterShareButton url={eventUrl}>
        <svg
          className="w-7 h-5 fill-blackCorp"
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
}
