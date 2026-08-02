"use client";

import { useAuth } from "@components/hooks/useAuth";
import { useTranslations } from "next-intl";
import { Link } from "@i18n/routing";
import useTrackedCta from "@components/hooks/useTrackedCta";
import type { ProfileClaimCtaProps } from "types/props";

export default function ProfileClaimCta({
  username,
}: ProfileClaimCtaProps) {
  const { status } = useAuth();
  const t = useTranslations("Components.Profile");
  const { ref: ctaRef, trackClick } = useTrackedCta<HTMLParagraphElement>("profile_claim_cta");

  if (status !== "unauthenticated") return null;

  return (
    <p ref={ctaRef} className="body-small text-foreground/60 mb-element-gap">
      {t("claimQuestion")}{" "}
      <Link
        href={`/iniciar-sessio?redirect=/perfil/${encodeURIComponent(username)}`}
        className="text-primary font-semibold"
        onClick={trackClick}
        data-analytics-action="profile_claim_login"
      >
        {t("claimLogin")}
      </Link>
    </p>
  );
}
