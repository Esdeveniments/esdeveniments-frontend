import { NextRequest, NextResponse } from 'next/server';
import { fetchEventsByTown } from '@lib/api/events';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const town = searchParams.get('town');

  if (!town) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  try {
    const events = await fetchEventsByTown(town);
    return NextResponse.json(events);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}
