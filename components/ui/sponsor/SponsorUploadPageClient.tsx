"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@i18n/routing";
import SponsorImageUpload from "./SponsorImageUpload";

export default function SponsorUploadPageClient() {
  const t = useTranslations("Patrocina");
  const router = useRouter();
  const searchParams = useSearchParams();

  const sessionId = searchParams.get("session_id");
  const placeSlug = searchParams.get("place");
  const placeName = searchParams.get("placeName");

  if (!sessionId) {
    return (
      <div className="card-bordered card-body max-w-2xl mx-auto text-center">
        <h2 className="heading-3 mb-2">{t("uploadPage.missingSessionTitle")}</h2>
        <p className="body-normal text-foreground/70 mb-6">
          {t("uploadPage.missingSessionSubtitle")}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/patrocina#pricing" className="btn-primary">
            {t("uploadPage.backToPricing")}
          </Link>
          <button
            type="button"
            className="btn-outline"
            onClick={() => router.back()}
          >
            {t("uploadPage.goBack")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="heading-1 mb-2">{t("checkout.successTitle")}</h1>
        <p className="body-normal text-foreground/70">
          {t("checkout.successSubtitle")}
        </p>
      </div>
      <SponsorImageUpload
        sessionId={sessionId}
        placeSlug={placeSlug}
        placeName={placeName}
      />
    </div>
  );
}

