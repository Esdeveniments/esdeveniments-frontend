import { useLocale, useTranslations } from "next-intl";
import { Link } from "@i18n/routing";
import ProfileAvatar from "@components/ui/profile/ProfileAvatar";
import VerifiedBadge from "@components/ui/profile/VerifiedBadge";
import { getProfileDisplayName } from "@utils/profile-name";
import { formatNamePrepositionParts } from "@utils/string-helpers";
import { getProfileSlug } from "@utils/user-helpers";
import type { EventOrganizerProps } from "types/props";
import type { AppLocale } from "types/i18n";

/** "Publicat per …" under the title, so visitors see who is behind the event first. */
export default function EventByline({ owner }: EventOrganizerProps) {
  const t = useTranslations("Components.EventDetailsSection");
  const locale = useLocale() as AppLocale;
  const name = getProfileDisplayName(owner);
  const by = formatNamePrepositionParts(name, locale, "by");
  const profileSlug = getProfileSlug(owner);

  return (
    <div className="flex items-center gap-2 body-small text-muted-foreground" data-testid="event-byline">
      <ProfileAvatar avatarUrl={owner.avatarUrl} name={name} size="xs" />
      <span className="min-w-0">
        {t.rich("createdBy", {
          by: by.preposition,
          name: by.place,
          link: (chunks) =>
            profileSlug ? (
              <Link
                href={`/perfil/${encodeURIComponent(profileSlug)}`}
                className="font-semibold text-foreground-strong hover:underline"
              >
                {chunks}
              </Link>
            ) : (
              <span className="font-semibold text-foreground-strong">{chunks}</span>
            ),
        })}
      </span>
      <VerifiedBadge role={owner.role} verified={owner.verified} />
    </div>
  );
}
