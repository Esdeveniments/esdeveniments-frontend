"use client";

import { useAuth } from "@components/hooks/useAuth";
import { useTranslations } from "next-intl";
import { Link } from "@i18n/routing";
import useTrackedCta from "@components/hooks/useTrackedCta";
import type { ProfileOwnerActionsProps } from "types/props";

export default function ProfileOwnerActions({
  username,
}: ProfileOwnerActionsProps) {
  const { user, logout } = useAuth();
  const t = useTranslations("Components.Profile");
  const tAuth = useTranslations("Components.Navbar.auth");
  const { ref: ctaRef, trackClick } = useTrackedCta<HTMLDivElement>("profile_edit_cta");

  if (user?.username !== username) return null;

  return (
    <div ref={ctaRef} className="inline-flex items-center gap-2">
      <Link href="/perfil/edita" className="btn-outline btn-sm" onClick={trackClick}>
        {t("editProfile")}
      </Link>
      <button
        type="button"
        onClick={() => logout()}
        className="btn-outline btn-sm"
        data-analytics-action="profile_logout_cta"
      >
        {tAuth("logout")}
      </button>
    </div>
  );
}
