import ProfileOwnerActions from "@components/ui/profile/ProfileOwnerActions";
import ProfileAvatar from "@components/ui/profile/ProfileAvatar";
import VerifiedBadge from "@components/ui/profile/VerifiedBadge";
import { getTranslations } from "next-intl/server";
import { getProfileDisplayName } from "@utils/profile-name";
import type { ProfileHeaderProps } from "types/props";

/**
 * Who this is (avatar, name, handle, count) and what they say about themselves.
 * Owner actions sit at the right of the avatar row, which always has the
 * avatar's height, so they can appear after hydration without moving anything.
 * No joined date: every account migrated in Nov 2026 shares one creation date.
 */
export default async function ProfileHeader({ profile }: ProfileHeaderProps) {
  const t = await getTranslations("Components.Profile");

  // Legacy `pictureUrl` comes from older backend instances.
  const displayName = getProfileDisplayName(profile);
  const avatarSrc = profile.avatarUrl || profile.pictureUrl;
  const eventCount = profile.eventCount ?? 0;

  // Cap runs of blank lines before rendering with whitespace-pre-line: the
  // 500-char limit alone doesn't stop a bio that's mostly newlines (e.g.
  // "\n" x200 plus a few words), which would otherwise blow up the page
  // with empty vertical space for every visitor. Normalize CRLF/CR to LF
  // first — otherwise a Windows-authored bio's "\r\n" runs slip past the
  // \n{3,} check entirely (the \r characters break up the consecutive-\n
  // count) and still produce the same wall of empty space.
  const bioText = profile.bio
    ?.trim()
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n");

  return (
    <header className="w-full flex flex-col gap-element-gap min-w-0" data-testid="profile-header">
      <div className="flex items-end justify-between gap-element-gap">
        <ProfileAvatar avatarUrl={avatarSrc} name={displayName} size="lg" eager />
        <ProfileOwnerActions
          username={profile.username}
          visits={profile.totalEventVisits}
        />
      </div>

      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="heading-1 break-words min-w-0">{displayName}</h1>
          <VerifiedBadge role={profile.role} verified={profile.verified} />
        </div>
        <p
          className="flex flex-wrap gap-x-2 body-small text-muted-foreground"
          data-testid="profile-stats"
        >
          <span className="break-all">@{profile.username}</span>
          {eventCount > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span>{t("totalEvents", { count: eventCount })}</span>
            </>
          )}
        </p>
      </div>

      {bioText && (
        <p
          data-testid="profile-bio"
          className="body-normal text-foreground max-w-prose whitespace-pre-line break-words"
        >
          {bioText}
        </p>
      )}
    </header>
  );
}
