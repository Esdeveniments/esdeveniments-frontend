"use client";

import { useAuth } from "@components/hooks/useAuth";
import { Link } from "@i18n/routing";
import { useTranslations } from "next-intl";
import type { ProfileOwnerActionsProps } from "types/props";

export default function ProfileOwnerActions({
  profileSlug,
}: ProfileOwnerActionsProps) {
  const { user, isAuthenticated } = useAuth();
  const t = useTranslations("Components.Profile");

  if (!isAuthenticated || user?.profileSlug !== profileSlug) return null;

  return (
    <Link
      href={`/perfil/${profileSlug}/edita` as `/${string}`}
      className="btn-outline text-sm"
      data-testid="profile-edit-button"
    >
      {t("editProfile")}
    </Link>
  );
}
