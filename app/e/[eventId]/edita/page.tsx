import { notFound } from "next/navigation";
import { fetchEventById } from "lib/api/events";
import EditEventClient from "./EditEventClient";
import { useGetRegionsWithCities } from "@components/hooks/useGetRegionsWithCities";

export default async function EditaPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const event = await fetchEventById((await params).eventId);
  const { regionsWithCities, isLoading: isLoadingRegionsWithCities } =
    useGetRegionsWithCities();

  if (!event || !regionsWithCities) return notFound();

  return (
    <EditEventClient
      event={event}
      regions={regionsWithCities}
      isLoadingRegionsWithCities={isLoadingRegionsWithCities}
    />
  );
}
