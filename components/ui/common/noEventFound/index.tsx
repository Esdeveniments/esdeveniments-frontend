import { getTranslations } from "next-intl/server";
import type { JSX } from "react";
import Image from "next/image";
import eventNotFound from "@public/static/images/error_404_page_not_found.png";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import { getLocaleSafely } from "@utils/i18n-seo";
import { DEFAULT_LOCALE } from "types/i18n";

const NoEventFound = async (): Promise<JSX.Element> => {
  const locale = await getLocaleSafely();
  const t = await getTranslations({
    locale,
    namespace: "Components.NoEventFound",
  });
  const prefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
  const withLocale = (path: string) => {
    if (!path.startsWith("/")) return path;
    if (!prefix) return path;
    if (path === "/") return prefix || "/";
    if (path.startsWith(prefix)) return path;
    return `${prefix}${path}`;
  };
  const description = t.rich("description", {
    search: (chunks) => (
      <PressableAnchor
        href={withLocale("/catalunya")}
        prefetch={false}
        className="font-bold text-black hover:underline"
        variant="inline"
      >
        {chunks}
      </PressableAnchor>
    ),
    today: (chunks) => (
      <PressableAnchor
        href={withLocale("/")}
        prefetch={false}
        className="font-bold text-black hover:underline"
        variant="inline"
      >
        {chunks}
      </PressableAnchor>
    ),
    publish: (chunks) => (
      <PressableAnchor
        href={withLocale("/publica")}
        prefetch={false}
        className="font-bold text-black hover:underline"
        variant="inline"
      >
        {chunks}
      </PressableAnchor>
    ),
    email: (chunks) => (
      <a className="font-bold text-black hover:underline" href="mailto:hola@esdeveniments.cat">
        {chunks}
      </a>
    ),
  });

  return (
    <div className="max-w-3xl mx-auto" data-testid="no-event-found">
      <div className="block blurred-image">
        <Image
          title={t("imageTitle")}
          src={eventNotFound}
          alt={t("imageAlt")}
          style={{
            maxWidth: "100%",
            height: "auto",
          }}
        />
      </div>
      <div className="flex flex-col h-full justify-center items-center text-center mx-4">
        <div className="reset-this">
          <h1>{t("title")}</h1>
        </div>
        <p className="mb-4">{description}</p>
      </div>
    </div>
  );
};

export default NoEventFound;
