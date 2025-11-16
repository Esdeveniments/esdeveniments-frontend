import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { siteUrl } from "@config/index";
import { fetchEventBySlug } from "lib/api/events";
import { fetchRegionsWithCities } from "lib/api/regions";
import EditEventClient from "./EditEventClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<Metadata> {
  const { eventId } = await params;
  const canonical = `${siteUrl}/e/${eventId}/edita`;
  return {
    title: "Editar esdeveniment",
    description: "Panell segur per editar esdeveniments d'Esdeveniments.cat.",
    robots: "noindex, nofollow",
    alternates: { canonical },
  };
}

export default async function EditaPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const slug = (await params).eventId;
  const event = await fetchEventBySlug(slug);
  const regionsWithCities = await fetchRegionsWithCities();

  if (!event || !regionsWithCities) return notFound();

  return <EditEventClient event={event} regions={regionsWithCities} />;
}
