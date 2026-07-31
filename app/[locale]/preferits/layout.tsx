import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

// Shared shell for /preferits and /preferits/passats, mirroring
// perfil/[username]/layout.tsx's role for the profile Propers/Passats
// pages: render the page identity once, let each page render its own
// Tabs + content underneath.
export default async function PreferitsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getTranslations("App.Favorites");

  return (
    <div className="container py-section-y flex-col justify-center items-center">
      <h1 className="heading-1 mt-element-gap mb-element-gap">
        {t("heading")}
      </h1>
      {children}
    </div>
  );
}
