import { notFound } from "next/navigation";
import { fetchEventBySlug } from "lib/api/events";
import { fetchRegionsWithCities } from "lib/api/regions";
import EditEventClient from "./EditEventClient";

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
