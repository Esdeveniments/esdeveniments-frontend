"use client";

import { useAuth } from "@components/hooks/useAuth";
import { useTranslations } from "next-intl";
import type { ProfileVisitsStatProps } from "types/props";

export default function ProfileVisitsStat({
  username,
  visits,
}: ProfileVisitsStatProps) {
  const { user } = useAuth();
  const t = useTranslations("Components.Profile");

  if (user?.username !== username) return null;

  return (
    <div className="flex flex-col items-center">
      <span className="heading-3 text-foreground-strong">{visits}</span>
      <span className="body-small text-foreground/60">{t("statsVisits")}</span>
    </div>
  );
}
