"use client";

import { useAuth } from "@components/hooks/useAuth";
import { useTranslations } from "next-intl";
import { Link } from "@i18n/routing";
import useTrackedCta from "@components/hooks/useTrackedCta";
import type { ProfileOwnerActionsProps } from "types/props";

export default function ProfileOwnerActions({
  username,
}: ProfileOwnerActionsProps) {
  const { user } = useAuth();
  const t = useTranslations("Components.Profile");
  const { ref: ctaRef, trackClick } = useTrackedCta<HTMLDivElement>("profile_edit_cta");

  if (user?.username !== username) return null;

  return (
    <div ref={ctaRef} className="inline-block">
      <Link href="/perfil/edita" className="btn-outline btn-sm" onClick={trackClick}>
        {t("editProfile")}
      </Link>
    </div>
  );
}
