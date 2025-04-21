import { notFound } from 'next/navigation';
import { fetchPlaceData } from '@lib/api/places';
import { generatePagesData } from '@components/partials/generatePagesData';
import EventsCategorized from '@components/ui/eventsCategorized';
import type { PageData } from 'types/common';

export default async function PlaceByDatePage({ params }) {
  const { place, byDate } = params;
  const placeData = await fetchPlaceData(place);

  if (!placeData) {
    notFound();
  }

  const pageData: PageData = await generatePagesData({
    currentYear: new Date().getFullYear(),
    place,
    byDate,
  });

  return <EventsCategorized pageData={pageData} />;
}
