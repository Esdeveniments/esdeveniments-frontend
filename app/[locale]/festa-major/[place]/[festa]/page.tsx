import { locale as rootLocale } from "next/root-params";
import FestaMajorPageView from "@components/ui/festaMajor/FestaMajorPageView";
import { buildFestaMajorMetadata } from "@lib/seo/festa-major";
import type { AppLocale } from "types/i18n";
import { loadFestaMajorPage } from "../../load-page";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/festa-major/[place]/[festa]">) {
  const locale = (await rootLocale()) as AppLocale;
  const { place, festa } = await params;
  const data = await loadFestaMajorPage(place, festa, locale);
  return buildFestaMajorMetadata(data, locale);
}

export default async function Page({
  params,
}: PageProps<"/[locale]/festa-major/[place]/[festa]">) {
  const locale = (await rootLocale()) as AppLocale;
  const { place, festa } = await params;
  const data = await loadFestaMajorPage(place, festa, locale);
  return <FestaMajorPageView data={data} locale={locale} />;
}
