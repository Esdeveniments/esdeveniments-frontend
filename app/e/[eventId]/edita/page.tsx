import { notFound } from "next/navigation";
import { fetchEventById } from "lib/api/events";
import { fetchRegionsWithCities } from "lib/api/regions";
import EditEventClient from "./EditEventClient";

export default async function EditaPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const event = await fetchEventById((await params).eventId);
  const regionsWithCities = await fetchRegionsWithCities();

  if (!event || !regionsWithCities) return notFound();

  return <EditEventClient event={event} regions={regionsWithCities} />;
}
