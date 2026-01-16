import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getLocaleSafely, withLocalePath } from "@utils/i18n-seo";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function Page() {
  const locale = await getLocaleSafely();
  redirect(withLocalePath("/sitemap", locale));
  return null;
}
