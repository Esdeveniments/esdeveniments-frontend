import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import type { AppLocale } from "types/i18n";

// Shared shell for /preferits and /preferits/passats, mirroring
// perfil/[username]/layout.tsx's role for the profile Propers/Passats
// pages: render the page identity once, let each page render its own
// Tabs + content underneath.
export default async function PreferitsLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Explicit locale: without it next-intl reads headers(), and this layout
  // sits outside preferits/loading.tsx, so it would block the shell.
  const locale = (await rootLocale()) as AppLocale;
  const t = await getTranslations({ locale, namespace: "App.Favorites" });

  return (
    <div className="container py-section-y flex flex-col justify-center items-center">
      <h1 className="heading-1 mt-element-gap mb-element-gap">
        {t("heading")}
      </h1>
      {children}
    </div>
  );
}
