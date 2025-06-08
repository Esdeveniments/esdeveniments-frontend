import { redirect } from "next/navigation";

// This route now redirects to the new query param structure
// Old: /figueres/avui → New: /figueres?date=avui

export default async function ByDatePage({
  params,
}: {
  params: Promise<{ place: string; byDate: string }>;
}) {
  const { place, byDate } = await params;
  
  // Permanent redirect to new query param structure
  // This preserves SEO juice and tells Google the new URL structure
  console.log(`🔄 Redirecting /${place}/${byDate} → /${place}?date=${byDate}`);
  redirect(`/${place}?date=${byDate}`);
}
