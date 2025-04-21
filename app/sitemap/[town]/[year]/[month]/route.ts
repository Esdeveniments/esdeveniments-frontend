import { NextRequest, NextResponse } from 'next/server';
import { fetchEventsByTownYearMonth } from '@lib/api/events';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const town = searchParams.get('town');
  const year = searchParams.get('year');
  const month = searchParams.get('month');

  if (!town || !year || !month) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  try {
    const events = await fetchEventsByTownYearMonth(town, year, month);
    return NextResponse.json(events);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}
