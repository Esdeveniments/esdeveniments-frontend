import { useTranslations } from "next-intl";
import { SocialIcon } from "./icons";
import { socialLinks } from "@config/index";

const SOCIAL_LINKS = [
  { platform: "instagram", label: "Instagram", href: socialLinks.instagram },
  { platform: "twitter", label: "X", href: socialLinks.twitter },
  { platform: "facebook", label: "Facebook", href: socialLinks.facebook },
  { platform: "threads", label: "Threads", href: socialLinks.threads },
  { platform: "linkedin", label: "LinkedIn", href: socialLinks.linkedin },
  { platform: "telegram", label: "Telegram", href: socialLinks.telegram },
  // { platform: "tiktok", label: "TikTok", href: socialLinks.tiktok },
  { platform: "mastodon", label: "Mastodon", href: socialLinks.mastodon },
] as const;

export default function SocialLinksSection({
  variant,
}: {
  variant: "mobile" | "desktop";
}) {
  const t = useTranslations("Components.SocialFollowPopup");
  return (
    <div className="flex flex-col gap-2.5">
      <p className="body-small font-semibold text-foreground/60 text-center uppercase tracking-wide">
        {t("followLabel")}
      </p>
      {variant === "mobile" ? (
        /* Horizontal scroll row. The inner `w-max mx-auto` wrapper centers
           the chips when they fit and keeps the row left-anchored (fully
           scrollable) when they overflow — `justify-center` on an
           overflowing flex container clips its start edge unreachably. */
        <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
          <div className="flex w-max mx-auto gap-1.5">
            {SOCIAL_LINKS.map((social) => (
              <a
                key={social.platform}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-center gap-1.5 px-3.5 py-2 rounded-full border border-border/60 bg-muted/30 hover:bg-primary/10 hover:border-primary/40 hover:scale-105 transition-[transform,background-color,border-color] duration-normal text-foreground body-small font-medium no-underline flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label={social.label}
              >
                <span className="text-primary">
                  <SocialIcon platform={social.platform} className="w-4 h-4" />
                </span>
              </a>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {SOCIAL_LINKS.map((social) => (
            <a
              key={social.platform}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-center gap-1.5 px-3 py-2.5 rounded-card border border-border/60 bg-muted/30 hover:bg-primary/10 hover:border-primary/40 hover:scale-105 transition-[transform,background-color,border-color] duration-normal text-foreground body-small font-medium no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label={social.label}
            >
              <span className="text-primary">
                <SocialIcon platform={social.platform} className="w-5 h-5" />
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
