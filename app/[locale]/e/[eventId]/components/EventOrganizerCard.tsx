import { useTranslations } from "next-intl";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { Link } from "@i18n/routing";
import ProfileAvatar from "@components/ui/profile/ProfileAvatar";
import VerifiedBadge from "@components/ui/profile/VerifiedBadge";
import { getProfileDisplayName } from "@utils/profile-name";
import { getProfileSlug } from "@utils/user-helpers";
import type { EventOrganizerProps } from "types/props";

/**
 * "Publicat per" card: photo or logo, name, verified badge and how many events
 * the organizer has published, linking to their profile (Luma "Hosted by",
 * Eventbrite "Organized by").
 */
export default function EventOrganizerCard({ owner }: EventOrganizerProps) {
  const t = useTranslations("Components.EventPage");
  const name = getProfileDisplayName(owner);
  const profileSlug = getProfileSlug(owner);
  // The event detail passes `owner` through unvalidated, so check the count here.
  const eventCount =
    Number.isInteger(owner.eventCount) && (owner.eventCount ?? 0) > 0
      ? owner.eventCount
      : undefined;

  const body = (
    <>
      <ProfileAvatar avatarUrl={owner.avatarUrl} name={name} size="md" />
      <span className="min-w-0 flex-1 flex flex-col">
        <span className="flex items-center gap-1">
          <span className="truncate body-normal font-semibold text-foreground-strong">{name}</span>
          <VerifiedBadge role={owner.role} verified={owner.verified} />
        </span>
        {profileSlug && (
          <span className="body-small text-muted-foreground">
            {eventCount
              ? t("organizerEventCount", { count: eventCount })
              : t("sidebarViewAllEvents")}
          </span>
        )}
      </span>
    </>
  );

  return (
    <div className="flex flex-col gap-2" data-testid="event-created-by">
      <h3 className="label font-semibold text-foreground-strong">{t("sidebarCreatedBy")}</h3>
      {profileSlug ? (
        <Link
          href={`/perfil/${encodeURIComponent(profileSlug)}`}
          className="card-bordered flex items-center gap-element-gap p-card-padding-sm hover:bg-muted transition-colors"
          data-testid="event-created-by-link"
        >
          {body}
          <ChevronRightIcon className="w-5 h-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Link>
      ) : (
        <div className="card-bordered flex items-center gap-element-gap p-card-padding-sm">{body}</div>
      )}
    </div>
  );
}
