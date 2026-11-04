import { CheckBadgeIcon, ShieldCheckIcon } from "@heroicons/react/24/solid";
import { useTranslations } from "next-intl";
import type { VerifiedBadgeProps } from "types/props";

export default function VerifiedBadge({ role, verified }: VerifiedBadgeProps) {
  const t = useTranslations("Components.Profile");

  if (!verified) return null;

  const isOrganizer = role === "ORGANIZATION";
  const Icon = isOrganizer ? ShieldCheckIcon : CheckBadgeIcon;
  const label = isOrganizer ? t("verifiedOrganizer") : t("verified");

  return (
    <Icon
      className="w-5 h-5 text-primary flex-shrink-0"
      role="img"
      aria-hidden="false"
      aria-label={label}
    />
  );
}
