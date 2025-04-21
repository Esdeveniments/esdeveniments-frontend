import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const events = await fetchEvents();
  return NextResponse.json({ events });
}

async function fetchEvents() {
  // Mock data for now
  return [
    { id: 1, name: 'Event 1' },
    { id: 2, name: 'Event 2' },
  ];
}
