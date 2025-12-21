"use client";
import { memo, JSX } from "react";
import { useTranslations } from "next-intl";
import { contactEmail } from "@config/index";

function AdBoard(): JSX.Element {
  const t = useTranslations("Components.AdBoard");

  return (
    <div className="flex flex-col items-center justify-center h-56 w-full bg-yellow-100 border border-yellow-300 rounded-lg p-4 text-center">
      <p className="text-lg font-semibold text-yellow-800">
        {t("title")}
      </p>
      <p className="text-sm text-yellow-700 mt-2">{t("body")}</p>
      <p className="text-sm text-yellow-700 mt-2">
        {t("contactPrefix")}{" "}
        <a
          className="text-primary"
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
