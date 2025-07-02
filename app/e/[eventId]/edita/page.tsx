import { notFound } from "next/navigation";
import { fetchEventById } from "lib/api/events";
import { fetchRegionsWithCities } from "lib/api/regions";
import { extractUuidFromSlug } from "@utils/string-helpers";
import EditEventClient from "./EditEventClient";

export default async function EditaPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const slug = (await params).eventId;
  const uuid = extractUuidFromSlug(slug);
  const event = await fetchEventById(uuid);
  const regionsWithCities = await fetchRegionsWithCities();

  if (!event || !regionsWithCities) return notFound();

  return <EditEventClient event={event} regions={regionsWithCities} />;
}
