"use client";

import { useAuth } from "@components/hooks/useAuth";
import { useTranslations } from "next-intl";
import { Link } from "@i18n/routing";
import useTrackedCta from "@components/hooks/useTrackedCta";
import type { ProfileOwnerActionsProps } from "types/props";

// Log out lives on the edit page, not here: no public profile we compared
// (Luma, Eventbrite, Meetup, RA, Dice, Fever) puts it on the public page.
export default function ProfileOwnerActions({
  username,
  visits,
}: ProfileOwnerActionsProps) {
  const { user } = useAuth();
  const t = useTranslations("Components.Profile");
  const { ref: ctaRef, trackClick } = useTrackedCta<HTMLDivElement>("profile_edit_cta");

  if (user?.username !== username) return null;

  return (
    <div ref={ctaRef} className="flex items-center gap-element-gap" data-testid="profile-owner-actions">
      {visits !== undefined && visits > 0 && (
        <span className="body-small text-muted-foreground">
          {t("visitsCount", { count: visits })}
        </span>
      )}
      <Link href="/perfil/edita" className="btn-neutral" onClick={trackClick}>
        {t("editProfile")}
      </Link>
    </div>
  );
}
