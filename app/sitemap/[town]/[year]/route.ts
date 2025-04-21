import { NextRequest, NextResponse } from 'next/server';
import { fetchEventsByTownYear } from '@lib/api/events';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const town = searchParams.get('town');
  const year = searchParams.get('year');

  if (!town || !year) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  try {
    const events = await fetchEventsByTownYear(town, year);
    return NextResponse.json(events);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}
