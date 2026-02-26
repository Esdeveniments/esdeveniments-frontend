"use client";

import { useAuth } from "@components/hooks/useAuth";
import { Link } from "@i18n/routing";
import { useTranslations } from "next-intl";
import type { ProfileClaimCtaProps } from "types/props";

export default function ProfileClaimCta({
  profileSlug,
}: ProfileClaimCtaProps) {
  const { status } = useAuth();
  const t = useTranslations("Components.Profile");

  if (status !== "unauthenticated") return null;

  return (
    <p className="body-small text-foreground/60 text-center mb-element-gap">
      {t("claimQuestion")}{" "}
      <Link
        href={`/iniciar-sessio?redirect=/perfil/${profileSlug}` as `/${string}`}
        className="text-primary font-semibold hover:underline"
      >
        {t("claimLogin")}
      </Link>
    </p>
  );
}
