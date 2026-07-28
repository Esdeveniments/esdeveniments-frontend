"use client";

import { useAuth } from "@components/hooks/useAuth";
import { useTranslations } from "next-intl";
import { Link } from "@i18n/routing";
import type { ProfileOwnerActionsProps } from "types/props";

export default function ProfileOwnerActions({
  username,
}: ProfileOwnerActionsProps) {
  const { user } = useAuth();
  const t = useTranslations("Components.Profile");

  if (user?.username !== username) return null;

  return (
    <Link href="/perfil/edita" className="btn-outline btn-sm">
      {t("editProfile")}
    </Link>
  );
}
