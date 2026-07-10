import ProfileOwnerActions from "@components/ui/profile/ProfileOwnerActions";
import { getTranslations } from "next-intl/server";
import { getLocaleSafely } from "@utils/i18n-seo";
import { parseBackendDateAsUtcMs } from "@utils/date-helpers";
import type { AppLocale } from "types/i18n";
import type { ProfileHeaderProps } from "types/props";

function AvatarFallback({ name }: { name: string }) {
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

/** Format a backend ISO date-time as a locale-aware month + year string.
 *  Uses parseBackendDateAsUtcMs to handle timezone-naive strings the backend
 *  may emit (e.g. "2023-01-15T10:30:00" without a Z suffix). */
function formatJoinedDate(isoDate: string, locale: AppLocale): string {
  const ms = parseBackendDateAsUtcMs(isoDate);
  if (ms === null) return "";
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(ms));
}

export default async function ProfileHeader({ profile }: ProfileHeaderProps) {
  const [t, locale] = await Promise.all([
    getTranslations("Components.Profile"),
    getLocaleSafely(),
  ]);

  const joinedDateText = profile.createdAt
    ? formatJoinedDate(profile.createdAt, locale)
    : "";

  return (
    <section
      className="card-bordered rounded-lg overflow-hidden mb-section-y w-full"
      aria-label={t("title", { name: profile.name })}
      data-testid="profile-header"
    >
      <div className="h-40 sm:h-52 w-full bg-muted" />

      <div className="px-section-x py-element-gap -mt-10 relative">
        <div className="flex items-end gap-element-gap mb-element-gap">
          {profile.pictureUrl ? (
            <img
              src={profile.pictureUrl}
              alt={profile.name}
              className="w-20 h-20 rounded-full object-cover border-4 border-background shadow-md"
              loading="eager"
            />
          ) : (
            <AvatarFallback name={profile.name} />
          )}
        </div>

        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <h1 className="heading-1 text-foreground">{profile.name}</h1>
          <ProfileOwnerActions username={profile.username} />
        </div>

        <p className="body-small text-foreground/60 mb-1">@{profile.username}</p>

        {joinedDateText && (
          <p className="body-small text-foreground/50">
            {t("joinedDate", { date: joinedDateText })}
          </p>
        )}
      </div>
    </section>
  );
}
