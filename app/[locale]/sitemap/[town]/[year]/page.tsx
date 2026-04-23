import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { withLocalePath } from "@utils/i18n-seo";
import { locale as rootLocale } from "next/root-params";
import type { AppLocale } from "types/i18n";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function Page() {
  const locale = (await rootLocale()) as AppLocale;
  redirect(withLocalePath("/sitemap", locale));
  return null;
}
