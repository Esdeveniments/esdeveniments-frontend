import { NextRequest, NextResponse } from "next/server";
import {
  CreateRestaurantLeadRequest,
  CreateRestaurantLeadResponse,
} from "types/api/restaurant";
import { isPricingAvailable } from "config/pricing";
import { handleApiError } from "@utils/api-error-handler";
import { createRateLimiter } from "@utils/rate-limit";

// 5 leads per minute per IP — prevents spam submissions
const limiter = createRateLimiter({ maxRequests: 5, windowMs: 60_000 });

/**
 * Create a restaurant promotion lead
 * Validates input and creates a pending lead for Stripe checkout
 */
export async function POST(request: NextRequest) {
  const blocked = limiter.check(request);
  if (blocked) return blocked;

  try {
    const body: CreateRestaurantLeadRequest = await request.json();

    // Honeypot validation (spam protection)
    if (body._honey) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Validate required fields
    const {
      restaurantName,
      location,
      displayDurationDays,
      geoScopeType,
      geoScopeId,
      image,
      eventId,
      placeId,
    } = body;

    if (
      !restaurantName ||
      !location ||
      !displayDurationDays ||
      !geoScopeType ||
      !geoScopeId ||
      !image ||
      !eventId
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate image object
    if (!image.public_id || !image.secure_url) {
      return NextResponse.json(
        { error: "Invalid image data" },
        { status: 400 }
      );
    }

    // Validate pricing availability
    if (!isPricingAvailable(displayDurationDays, geoScopeType)) {
      return NextResponse.json(
        { error: "Invalid pricing combination" },
        { status: 400 }
      );
    }

    // Validate geo scope type
    if (!["town", "region"].includes(geoScopeType)) {
      return NextResponse.json(
        { error: "Invalid geo scope type" },
        { status: 400 }
      );
    }

    // Validate duration (should be from allowed values)
    const allowedDurations = [1, 3, 5, 7, 14, 30];
    if (!allowedDurations.includes(displayDurationDays)) {
      return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
    }

    // Generate lead ID (in production, this would be a UUID from database)
    const leadId = `lead_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // In a real implementation, this would save to database
    // For now, we'll simulate the lead creation
    const lead = {
      id: leadId,
      restaurantName: restaurantName.trim(),
      location: location.trim(),
      displayDurationDays,
      geoScopeType,
      geoScopeId,
      image,
      eventId,
      placeId: placeId?.trim() || undefined,
      status: "pending_payment" as const,
      createdAt: new Date().toISOString(),
    };

    // TODO: Save to database
    console.log("Created restaurant lead:", lead);

    const response: CreateRestaurantLeadResponse = {
      leadId,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    return handleApiError(error, "/api/leads/restaurant", {
      errorMessage: "Failed to create lead",
    });
  }
}
