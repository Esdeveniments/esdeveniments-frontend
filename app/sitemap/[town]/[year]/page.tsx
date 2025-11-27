import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Redirecció d'arxiu",
  robots: "noindex, nofollow",
};

export default function Page() {
  redirect("/sitemap");
  return null;
}
