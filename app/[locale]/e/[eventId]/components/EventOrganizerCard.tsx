import { useTranslations } from "next-intl";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import SectionHeading from "@components/ui/common/SectionHeading";
import { Link } from "@i18n/routing";
import ProfileAvatar from "@components/ui/profile/ProfileAvatar";
import VerifiedBadge from "@components/ui/profile/VerifiedBadge";
import { getProfileDisplayName } from "@utils/profile-name";
import { getProfileSlug } from "@utils/user-helpers";
import type { EventOrganizerProps } from "types/props";

/**
 * "Organitzador" card: photo or logo, name, verified badge and how many events
 * the organizer has published, linking to their profile (Luma "Hosted by",
 * Eventbrite "Organized by").
 */
export default function EventOrganizerCard({ owner, compact = false }: EventOrganizerProps) {
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
        {eventCount ? (
          <span className="body-small text-muted-foreground">
            {t("organizerEventCount", { count: eventCount })}
          </span>
        ) : (
          profileSlug && (
            <span className="body-small text-muted-foreground">{t("sidebarViewAllEvents")}</span>
          )
        )}
      </span>
    </>
  );

  return (
    <section className="stack" data-testid="event-created-by">
      {compact ? (
        <h2 className="heading-4">{t("organizer")}</h2>
      ) : (
        <SectionHeading title={t("organizer")} titleClassName="heading-2" />
      )}
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
    </section>
  );
}
