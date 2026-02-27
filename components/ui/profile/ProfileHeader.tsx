import Badge from "@components/ui/common/badge";
import { SocialIcon } from "@components/ui/common/social/icons";
import { getTranslations } from "next-intl/server";
import ProfileOwnerActions from "./ProfileOwnerActions";
import type { ProfileHeaderProps, AvatarFallbackProps } from "types/props";

function AvatarFallback({ name }: AvatarFallbackProps) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div
      className="w-20 h-20 rounded-full bg-primary text-white flex items-center justify-center text-3xl font-bold"
      role="img"
      aria-label={name}
    >
      {initial}
    </div>
  );
}

export default async function ProfileHeader({ profile }: ProfileHeaderProps) {
  const t = await getTranslations("Components.Profile");

  return (
    <section
      className="card-bordered rounded-lg overflow-hidden mb-section-y"
      aria-label={t("title", { name: profile.name })}
      data-testid="profile-header"
    >
      {/* Cover image — decorative, empty alt */}
      {profile.coverUrl ? (
        <div className="h-40 sm:h-52 w-full overflow-hidden">
          <img
            src={profile.coverUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="h-40 sm:h-52 w-full bg-muted" />
      )}

      {/* Profile info */}
      <div className="px-section-x py-element-gap -mt-10 relative">
        <div className="flex items-end gap-element-gap mb-element-gap">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={t("title", { name: profile.name })}
              className="w-20 h-20 rounded-full border-4 border-background object-cover"
            />
          ) : (
            <AvatarFallback name={profile.name} />
          )}
        </div>

        <div className="flex items-center flex-wrap gap-2 mb-2">
          <h1 className="heading-1 text-foreground">{profile.name}</h1>
          {profile.verified && (
            <Badge className="bg-primary/10 text-primary border-primary/30">
              {t("verified")}
            </Badge>
          )}
          <ProfileOwnerActions profileSlug={profile.slug} />
        </div>

        {profile.bio && (
          <p className="body-normal text-foreground/80 mb-element-gap">
            {profile.bio}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4 text-sm text-foreground/60">
          {profile.totalEvents > 0 && (
            <span>{t("totalEvents", { count: profile.totalEvents })}</span>
          )}
          {(profile.city || profile.region) && (
            <span>
              {[profile.city, profile.region].filter(Boolean).join(", ")}
            </span>
          )}
          {profile.website && /^https?:\/\//i.test(profile.website) && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {t("website")}
            </a>
          )}
        </div>

        {/* Social links — reuses SocialIcon from design system */}
        {profile.socialLinks && Object.keys(profile.socialLinks).length > 0 && (
          <div className="flex items-center gap-2 mt-element-gap">
            {Object.entries(profile.socialLinks).map(([platform, url]) =>
              url ? (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full hover:bg-muted transition-interactive"
                  aria-label={platform}
                >
                  <SocialIcon platform={platform} className="w-4 h-4 fill-foreground/60 hover:fill-primary transition-colors" />
                </a>
              ) : null
            )}
          </div>
        )}
      </div>
    </section>
  );
}
