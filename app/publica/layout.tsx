import { ReactNode } from "react";
import { buildPageMeta } from "@components/partials/seo-meta";
import { siteUrl } from "@config/index";

export const metadata = buildPageMeta({
  title: "Publica - Esdeveniments.cat",
  description: "Publica un acte cultural - Esdeveniments.cat",
  canonical: `${siteUrl}/publica`,
});

export default function PublicaLayout({ children }: { children: ReactNode }) {
  return children;
}
