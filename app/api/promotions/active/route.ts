import { NextRequest, NextResponse } from "next/server";
import { ActivePromotion } from "types/api/restaurant";

/**
 * Placeholder endpoint to fetch active promotion for an event.
 * Returns null until backend persistence is implemented.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json(
      { error: "Missing eventId parameter" },
      { status: 400 }
    );
  }

  // TODO: Replace with real database lookup when backend is implemented
  // const promotion = await getActivePromotionForEvent(eventId);

  // For now, always return null (no active promotions)
  const activePromotion: ActivePromotion | null = null;

  return NextResponse.json(activePromotion, { status: 200 });
}
