import { JSX } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SocialIcon } from "./icons";
import { SocialProps } from "types/props";

const SOCIAL_BUTTON_CLASS =
  "px-3 py-3 bg-muted/60 hover:bg-primary/10 border border-border/40 hover:border-primary/40 rounded-full transition-all duration-normal hover:scale-110 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

const ICON_CLASS = "w-5 h-5 fill-primary transition-colors";

/**
 * Renders a social media button with icon for the footer.
 * Uses shared SocialIcon component to avoid duplicating SVG paths.
 */
function renderSocialButton(
  platform: string,
  label: string,
  link: string | undefined,
  relExtra?: string,
): JSX.Element | null {
  if (!link) return null;

  const rel = relExtra
    ? `${relExtra} noopener noreferrer`
    : "noopener noreferrer";

  return (
    <Link
      href={link}
      className={`no-underline ${SOCIAL_BUTTON_CLASS}`}
      rel={rel}
      target="_blank"
      aria-label={label}
    >
      <SocialIcon platform={platform} className={ICON_CLASS} />
    </Link>
  );
}

export default async function Social({ links }: SocialProps): Promise<JSX.Element> {
  const t = await getTranslations("Components.Social");
  return (
    <div className="flex flex-col items-center gap-element-gap-sm">
      <h3 className="body-small font-semibold text-muted-foreground uppercase tracking-wider">
        {t("followUs")}
      </h3>
      <div className="flex justify-center items-center gap-3 flex-wrap">
        {renderSocialButton("instagram", "Instagram", links.instagram)}
        {renderSocialButton("facebook", "Facebook", links.facebook)}
        {renderSocialButton("twitter", "Twitter", links.twitter)}
        {renderSocialButton("threads", "Threads", links.threads)}
        {/* {renderSocialButton("tiktok", "TikTok", links.tiktok)} */}
        {renderSocialButton("mastodon", "Mastodon", links.mastodon, "me")}
        {renderSocialButton("linkedin", "LinkedIn", links.linkedin)}
        {renderSocialButton("telegram", "Telegram", links.telegram)}
      </div>
    </div>
  );
}
