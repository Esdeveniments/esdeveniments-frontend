import { NextRequest, NextResponse } from 'next/server';
import { fetchEventById, updateEvent } from '@lib/api/events';
import { EventDetailResponseDTO } from 'types/api/event';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');

  if (!eventId) {
    return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
  }

  const event: EventDetailResponseDTO | null = await fetchEventById(eventId);

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  return NextResponse.json({ event });
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');

  if (!eventId) {
    return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
  }

  const eventData = await request.json();

  try {
    const updatedEvent = await updateEvent(eventId, eventData);
    return NextResponse.json({ event: updatedEvent });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}
