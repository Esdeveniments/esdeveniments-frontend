import { NextResponse } from "next/server";
import { getOccupiedPlaceStatus } from "@lib/db/sponsors";

/**
 * GET /api/sponsors/availability
 *
 * Returns occupied places with remaining days for the PlaceSelector.
 * Includes both 'active' and 'pending_image' sponsors (place is booked).
 *
 * Response: { occupied: Record<string, number> }
 * Example: { occupied: { "barcelona": 5, "maresme": 12 } }
 */
export async function GET() {
  try {
    const status = await getOccupiedPlaceStatus();
    const occupied = Object.fromEntries(status);

    return NextResponse.json(
      { occupied },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    console.error("Failed to fetch sponsor availability:", error);
    return NextResponse.json({ occupied: {} }, { status: 200 });
  }
}
