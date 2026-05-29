"use client";

import { useAuth } from "@components/hooks/useAuth";
import { useTranslations } from "next-intl";
import type { ProfileOwnerActionsProps } from "types/props";

export default function ProfileOwnerActions({
  username,
}: ProfileOwnerActionsProps) {
  const { user } = useAuth();
  const t = useTranslations("Components.Profile");

  if (user?.username !== username) return null;

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
