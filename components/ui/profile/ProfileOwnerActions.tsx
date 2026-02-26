"use client";

import { useAuth } from "@components/hooks/useAuth";
import { useTranslations } from "next-intl";
import type { ProfileOwnerActionsProps } from "types/props";

export default function ProfileOwnerActions({
  profileSlug,
}: ProfileOwnerActionsProps) {
  const { user, isAuthenticated } = useAuth();
  const t = useTranslations("Components.Profile");

  if (!isAuthenticated || user?.profileSlug !== profileSlug) return null;

  return (
    <button
      type="button"
      disabled
      className="btn-outline text-sm opacity-60 cursor-not-allowed"
      title={t("comingSoon")}
    >
      {t("editProfile")} {t("comingSoon")}
    </button>
  );
}
