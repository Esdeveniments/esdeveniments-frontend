import { NextRequest, NextResponse } from "next/server";
import { GooglePlaceResponse } from "types/api/restaurant";

export const runtime = "nodejs";

/**
 * Google Places Nearby Search API proxy
 * Fetches restaurants near an event location
 * Only stores place_id indefinitely, lat/lng for max 30 days
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radius = searchParams.get("radius") || "1000"; // meters
  const limit = parseInt(searchParams.get("limit") || "3");

  // Validate required parameters
  if (!lat || !lng) {
    return NextResponse.json(
      { error: "Missing required parameters: lat, lng" },
      { status: 400 }
    );
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error("GOOGLE_PLACES_API_KEY is not configured");
    return NextResponse.json(
      { error: "Places API not configured" },
      { status: 500 }
    );
  }

  try {
    const fields = [
      "places.name",
      "places.displayName",
      "places.formattedAddress",
      "places.rating",
      "places.priceLevel",
      "places.types",
      "places.location", // Changed from geometry to location
      "places.photos",
    ].join(",");

    const url = new URL("https://places.googleapis.com/v1/places:searchNearby");

    const requestBody = {
      includedTypes: ["restaurant"],
      maxResultCount: limit,
      locationRestriction: {
        circle: {
          center: {
            latitude: parseFloat(lat),
            longitude: parseFloat(lng),
          },
          radius: parseFloat(radius),
        },
      },
    };

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fields,
      },
      body: JSON.stringify(requestBody),
      next: {
        revalidate: 3600, // Cache for 1 hour
        tags: ["places", `places:${lat}:${lng}`],
      },
    });

    const data = await response.json();

    // Handle API errors
    if (!response.ok) {
      console.error("Google Places API error:", response.status, data);
      console.error("Request body was:", JSON.stringify(requestBody, null, 2));
      console.error("Request headers were:", {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey ? "***" : "MISSING",
        "X-Goog-FieldMask": fields,
      });
      return NextResponse.json(
        { error: "Places API error", status: response.status, details: data },
        { status: 500 }
      );
    }

    // Transform New API response to match expected format
    const places = data.places || [];
    const limitedResults = places
      .slice(0, limit)
      .map((place: GooglePlaceResponse) => {
        const placeId = place.name?.replace("places/", "") || "";

        return {
          place_id: placeId,
          name: place.displayName?.text || "Restaurant",
          vicinity: place.formattedAddress || "Localització no disponible",
          rating: place.rating,
          price_level: place.priceLevel || undefined,
          types: place.types || [],
          geometry: {
            location: {
              lat: place.location?.latitude || 0,
              lng: place.location?.longitude || 0,
            },
          },
          photos: place.photos?.slice(0, 1) || undefined,
        };
      });

    return NextResponse.json({
      results: limitedResults,
      status: "OK",
      attribution: "Powered by Google",
    });
  } catch (error) {
    console.error("Error fetching places:", error);
    return NextResponse.json(
      { error: "Failed to fetch places" },
      { status: 500 }
    );
  }
}
