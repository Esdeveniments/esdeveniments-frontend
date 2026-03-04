"use client";

import { useAuth } from "@components/hooks/useAuth";
import { useTranslations } from "next-intl";
import { Link } from "@i18n/routing";
import type { ProfileClaimCtaProps } from "types/props";

export default function ProfileClaimCta({
  profileSlug,
}: ProfileClaimCtaProps) {
  const { status } = useAuth();
  const t = useTranslations("Components.Profile");

  if (status !== "unauthenticated") return null;

  return (
    <p className="body-small text-foreground/60 mb-element-gap">
      {t("claimQuestion")}{" "}
      <Link
        href={`/iniciar-sessio?redirect=/perfil/${profileSlug}`}
        className="text-primary font-semibold"
      >
        {t("claimLogin")}
      </Link>
    </p>
  );
}
