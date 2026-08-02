import { CheckBadgeIcon, ShieldCheckIcon } from "@heroicons/react/24/solid";
import { useTranslations } from "next-intl";
import type { VerifiedBadgeProps } from "types/props";

export default function VerifiedBadge({
  role,
  verified,
  organizerVerified,
}: VerifiedBadgeProps) {
  const t = useTranslations("Components.Profile");

  // `verified` undefined means the backend hasn't cut over yet — fall back
  // to the legacy organizerVerified flag so already-verified organizers
  // don't lose their badge mid-transition.
  const isVerified = verified ?? organizerVerified;
  if (!isVerified) return null;

  const isOrganizer = role ? role === "ORGANIZATION" : organizerVerified === true;
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
