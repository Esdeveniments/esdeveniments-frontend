import { notFound } from 'next/navigation';
import { fetchEventById } from '@lib/api/events';
import { getFormattedDate } from '@utils/helpers';
import { EventDetailResponseDTO } from 'types/api/event';
import { JSX } from 'react';

interface EventPageProps {
  params: {
    eventId: string;
  };
}

export default async function EventPage({ params }: EventPageProps): Promise<JSX.Element> {
  const event: EventDetailResponseDTO | null = await fetchEventById(params.eventId);

  if (!event) {
    notFound();
  }

  const { formattedStart, formattedEnd } = getFormattedDate(event.startDate, event.endDate);

  return (
    <div>
      <h1>{event.title}</h1>
      <p>{event.description}</p>
      <p>
        {formattedStart} - {formattedEnd}
      </p>
      <p>{event.location}</p>
    </div>
  );
}
