"use client";
import { memo, JSX } from "react";
import { useTranslations } from "next-intl";
import { contactEmail } from "@config/index";

function AdBoard(): JSX.Element {
  const t = useTranslations("Components.AdBoard");

  return (
    <div className="flex flex-col items-center justify-center h-56 w-full bg-muted/50 border border-border rounded-card p-card-padding text-center mb-4">
      <p className="body-normal font-semibold text-foreground/80">
        {t("title")}
      </p>
      <p className="body-small text-muted-foreground mt-2">{t("body")}</p>
      <p className="body-small text-muted-foreground mt-2">
        {t("contactPrefix")}{" "}
        <a
          className="text-primary underline hover:no-underline"
          href={`mailto:${contactEmail}`}
          rel="noopener noreferrer"
        >
          {t("contactCta")}
        </a>{" "}
        {t("contactSuffix")}
      </p>
    </div>
  );
}

export default memo(AdBoard);
