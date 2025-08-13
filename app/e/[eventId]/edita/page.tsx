import { notFound, redirect } from "next/navigation";
import { fetchEventBySlug } from "lib/api/events";
import { fetchRegionsWithCities } from "lib/api/regions";
import EditEventClient from "./EditEventClient";
import { cookies } from "next/headers";
import { getOwnership, getUserBySessionToken } from "@lib/server/db";

export default async function EditaPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const slug = (await params).eventId;

  // Server-side auth + ownership check
  const token = (await cookies()).get("session")?.value;
  const user = await getUserBySessionToken(token);
  if (!user) redirect("/auth/login");
  const owned = await getOwnership(user.id);
  if (!owned.includes(slug)) return notFound();

  const event = await fetchEventBySlug(slug);
  const regionsWithCities = await fetchRegionsWithCities();

  if (!event || !regionsWithCities) return notFound();

  return <EditEventClient event={event} regions={regionsWithCities} />;
}
