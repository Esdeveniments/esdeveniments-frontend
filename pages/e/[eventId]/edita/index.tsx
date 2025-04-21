'use client';

import { useState, useEffect, JSX } from 'react';
import { useRouter } from 'next/router';
import { fetchEventById, updateEvent } from '@lib/api/events';
import { getFormattedDate } from '@utils/helpers';
import { EventDetailResponseDTO } from 'types/api/event';

export default function EditEventPage(): JSX.Element {
  const router = useRouter();
  const { eventId } = router.query;
  const [event, setEvent] = useState<EventDetailResponseDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (eventId) {
      fetchEventById(eventId as string)
        .then((data) => {
          setEvent(data);
          setLoading(false);
        })
        .catch((err) => {
          setError('Failed to fetch event');
          setLoading(false);
        });
    }
  }, [eventId]);

  const handleUpdate = async (updatedEvent: EventDetailResponseDTO) => {
    try {
      await updateEvent(eventId as string, updatedEvent);
      router.push(`/e/${eventId}`);
    } catch (err) {
      setError('Failed to update event');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!event) {
    return <div>Event not found</div>;
  }

  const { formattedStart, formattedEnd } = getFormattedDate(event.startDate, event.endDate);

  return (
    <div>
      <h1>Edit Event: {event.title}</h1>
      <p>{event.description}</p>
      <p>
        {formattedStart} - {formattedEnd}
      </p>
      <p>{event.location}</p>
      {/* Add form fields to edit the event */}
      <button onClick={() => handleUpdate(event)}>Update Event</button>
    </div>
  );
}
