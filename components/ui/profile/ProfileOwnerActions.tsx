"use client";

import { useAuth } from "@components/hooks/useAuth";
import { useTranslations } from "next-intl";
import type { ProfileOwnerActionsProps } from "types/props";

export default function ProfileOwnerActions({
  profileSlug,
}: ProfileOwnerActionsProps) {
  const { user } = useAuth();
  const t = useTranslations("Components.Profile");

  if (user?.profileSlug !== profileSlug) return null;

  return (
    <button
      type="button"
      className="btn-outline btn-sm"
      disabled
      aria-label={`${t("editProfile")} ${t("comingSoon")}`}
    >
      {t("editProfile")} {t("comingSoon")}
    </button>
  );
}
