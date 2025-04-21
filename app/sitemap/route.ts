import { NextResponse } from 'next/server';
import { fetchRegionsWithCities } from '@lib/api/regions';

export async function GET() {
  const regions = await fetchRegionsWithCities();
  return NextResponse.json({ regions });
}
