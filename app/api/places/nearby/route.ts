import { NextRequest, NextResponse } from "next/server";
import {
  GooglePlaceResponse,
  GooglePlacesNearbyRequest,
  GooglePlacesSearchNearbyRawResponse,
  PlaceOpeningHoursPoint,
  PlaceOpeningHoursPeriod,
  OpenConfidence,
  OpeningInfo,
  OpeningSegment,
} from "types/api/restaurant";

export const runtime = "nodejs";

/**
 * Google Places Nearby Search API proxy
 * Returns only restaurants that are open on the provided event date (place-local).
 * - Within 7 days: use currentOpeningHours date-bounded periods.
 * - Beyond 7 days: fall back to regularOpeningHours weekly schedule (likely open).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radius = searchParams.get("radius") || "5000"; // meters
  const limit = parseInt(searchParams.get("limit") || "3", 10);

  // Event date (YYYY-MM-DD) in place-local calendar
  const eventDateISO = searchParams.get("date");

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

  const sameISO = (a?: string, b?: string) => !!a && !!b && a === b;

  // Convert a Point (period.open/close) into ISO yyyy-mm-dd in place-local time
  function pointDateToISO(
    point: PlaceOpeningHoursPoint | undefined
  ): string | undefined {
    if (!point) return undefined;
    const d = point.date;
    if (!d) return undefined;
    if (typeof d === "string") return d.slice(0, 10);
    const { year, month, day } = d;
    if (year && month && day) {
      const mm = String(month).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      return `${year}-${mm}-${dd}`;
    }
    return undefined;
  }

  function isOpenOnDateUsingCurrentHours(
    place: GooglePlaceResponse,
    isoDate: string
  ): boolean {
    const ch = place.currentOpeningHours;
    if (!ch?.periods?.length) return false;
    return ch.periods.some((p: PlaceOpeningHoursPeriod) => {
      const openISO = pointDateToISO(p.open);
      const closeISO = pointDateToISO(p.close);
      if (sameISO(openISO, isoDate)) return true;
      if (sameISO(closeISO, isoDate)) return true;
      if (openISO && closeISO) {
        return openISO < isoDate && closeISO > isoDate;
      }
      return false;
    });
  }

  function isOpenOnDateUsingRegularHours(
    place: GooglePlaceResponse,
    isoDate: string
  ): boolean {
    const rh = place.regularOpeningHours;
    if (!rh?.periods?.length) return false;
    const wd = new Date(`${isoDate}T12:00:00`).getDay(); // 0=Sun..6=Sat
    return rh.periods.some((p: PlaceOpeningHoursPeriod) => {
      const od = p.open?.day;
      const cd = p.close?.day;
      if (od === wd) return true;
      if (typeof od === "number" && typeof cd === "number") {
        if (cd === wd && cd !== od) return true; // overnight spill
      }
      if (typeof od === "number" && p.close == null && od === wd) return true; // 24h
      return false;
    });
  }

  function isOperational(place: GooglePlaceResponse): boolean {
    return place.businessStatus === "OPERATIONAL" || !place.businessStatus;
  }

  function extractISODate(point?: PlaceOpeningHoursPoint): string | undefined {
    if (!point?.date) return undefined;
    if (typeof point.date === "string") return point.date.slice(0, 10);
    const { year, month, day } = point.date;
    if (year && month && day) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
        2,
        "0"
      )}`;
    }
    return undefined;
  }

  function periodMatchesDate(
    period: PlaceOpeningHoursPeriod,
    isoDate: string
  ): boolean {
    const openDate = extractISODate(period.open);
    const closeDate = extractISODate(period.close);
    if (!openDate && !closeDate) return false;
    if (openDate === isoDate || closeDate === isoDate) return true;
    if (openDate && closeDate && openDate < isoDate && closeDate > isoDate)
      return true;
    return false;
  }

  function pad(n: number | undefined): string {
    return String(n ?? 0).padStart(2, "0");
  }

  function buildOpeningInfo(
    place: GooglePlaceResponse,
    isoDate: string | null
  ): { info: OpeningInfo; weekdayText?: string[] } {
    const weekdayText =
      place.currentOpeningHours?.weekdayDescriptions ||
      place.regularOpeningHours?.weekdayDescriptions ||
      [];

    // Helper: convert a 12h time like "8:00 AM" or "12:30 PM" to 24h HH:MM
    function to24h(t: string): string {
      const trimmed = t.trim();
      // Try various time formats that Google might use
      let match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!match) {
        // Try without space before AM/PM
        match = trimmed.match(/^(\d{1,2}):(\d{2})(AM|PM)$/i);
      }
      if (!match) {
        // Try format like "1 PM" or "12 AM"
        match = trimmed.match(/^(\d{1,2})\s*(AM|PM)$/i);
        if (match) {
          match = [match[0], match[1], "00", match[2]];
        }
      }
      if (!match) return trimmed; // fallback if unexpected format

      const [, hStr, m = "00", apRaw] = match;
      let h = parseInt(hStr, 10);
      const ap = apRaw.toUpperCase();
      if (ap === "AM" && h === 12) h = 0;
      if (ap === "PM" && h !== 12) h += 12;
      return `${String(h).padStart(2, "0")}:${m || "00"}`;
    }

    // Event date path: show explicit ranges for that day
    if (isoDate) {
      const periods = place.currentOpeningHours?.periods?.length
        ? place.currentOpeningHours.periods
        : place.regularOpeningHours?.periods;
      const segments: OpeningSegment[] = [];
      if (periods) {
        for (const p of periods) {
          if (periodMatchesDate(p, isoDate)) {
            if (p.open) {
              const start = `${pad(p.open.hour)}:${pad(p.open.minute)}`;
              let end = "";
              let overnight = false;
              if (p.close) {
                end = `${pad(p.close.hour)}:${pad(p.close.minute)}`;
                const openDate = extractISODate(p.open);
                const closeDate = extractISODate(p.close);
                overnight = !!(openDate && closeDate && openDate !== closeDate);
              } else {
                end = "24:00"; // open ended until midnight
              }
              segments.push({
                start,
                end,
                overnight,
                source: place.currentOpeningHours?.periods?.length
                  ? "current"
                  : "regular",
              });
            }
          }
        }
      }
      if (segments.length) {
        return {
          info: {
            open_status: "unknown", // status relative to event date not “now”
            segments,
            event_date: isoDate,
            source: segments[0]?.source,
            is_24h:
              segments.length === 1 &&
              segments[0].start === "00:00" &&
              segments[0].end === "24:00",
          },
          weekdayText,
        };
      }
      // Fallback: derive from weekday description for that weekday
      const wdIdx = new Date(`${isoDate}T12:00:00`).getDay();
      const line = weekdayText[wdIdx];
      if (line) {
        const afterColon = line.includes(":")
          ? line.substring(line.indexOf(":") + 1).trim()
          : line;

        // Handle "Closed" case
        if (
          afterColon.toLowerCase().includes("closed") ||
          afterColon.toLowerCase().includes("cerrat")
        ) {
          return {
            info: {
              open_status: "closed",
              event_date: isoDate,
              source: place.currentOpeningHours?.weekdayDescriptions
                ? "current"
                : "regular",
            },
            weekdayText,
          };
        }

        // Try to parse time ranges with various separators
        const parts = afterColon.split(/[–—-]|to/i).map((p) => p.trim());
        if (parts.length === 2) {
          const start = to24h(parts[0]);
          const end = to24h(parts[1]);
          // Only create segments if we successfully parsed both times
          if (start.match(/^\d{2}:\d{2}$/) && end.match(/^\d{2}:\d{2}$/)) {
            return {
              info: {
                open_status: "unknown",
                segments: [
                  {
                    start,
                    end,
                    overnight: start > end, // detect overnight (e.g., 22:00-02:00)
                    source: place.currentOpeningHours?.weekdayDescriptions
                      ? "current"
                      : "regular",
                  },
                ],
                event_date: isoDate,
                source: place.currentOpeningHours?.weekdayDescriptions
                  ? "current"
                  : "regular",
                is_24h:
                  start === "00:00" && (end === "24:00" || end === "00:00"),
              },
              weekdayText,
            };
          }
        }

        // If we have text but couldn't parse it, still return some info
        return {
          info: {
            open_status: "unknown",
            event_date: isoDate,
            source: place.currentOpeningHours?.weekdayDescriptions
              ? "current"
              : "regular",
          },
          weekdayText,
        };
      }
      return {
        info: { open_status: "unknown", event_date: isoDate },
        weekdayText,
      };
    }

    // No event date: treat as 'today' UX like Google Maps (open/close status).
    if (weekdayText.length) {
      const todayIdx = new Date().getDay();
      const line = weekdayText[todayIdx];
      if (line) {
        const afterColon = line.includes(":")
          ? line.substring(line.indexOf(":") + 1).trim()
          : line;
        // Expect something like "8:00 AM – 12:00 AM"
        const parts = afterColon.split(/[–-]/).map((p) => p.trim());
        if (parts.length === 2) {
          const start = to24h(parts[0]);
          const end = to24h(parts[1]);
          const openNow = place.currentOpeningHours?.openNow;
          const info: OpeningInfo = {
            open_status:
              openNow === true
                ? "open"
                : openNow === false
                ? "closed"
                : "unknown",
            segments: [
              {
                start,
                end,
                overnight: false,
                source: place.currentOpeningHours?.weekdayDescriptions
                  ? "current"
                  : "regular",
              },
            ],
            source: place.currentOpeningHours?.weekdayDescriptions
              ? "current"
              : "regular",
            is_24h: start === "00:00" && (end === "24:00" || end === "00:00"),
          };
          return { info, weekdayText };
        }
        return { info: { open_status: "unknown" }, weekdayText };
      }
    }
    return { info: { open_status: "unknown" }, weekdayText };
  }

  try {
    const fields = [
      "places.name",
      "places.displayName",
      "places.formattedAddress", // kept temporarily (legacy)
      "places.rating",
      "places.priceLevel",
      "places.location",
      "places.photos",
      "places.businessStatus",
      "places.currentOpeningHours",
      "places.regularOpeningHours",
      "places.utcOffsetMinutes",
      "places.postalAddress.addressLines",
      "places.postalAddress.locality",
      "places.postalAddress.administrativeArea",
      "places.postalAddress.postalCode",
    ].join(",");

    const url = new URL("https://places.googleapis.com/v1/places:searchNearby");

    const requestedCount = Math.min(Math.max(limit * 3, 12), 20);

    const requestBody: GooglePlacesNearbyRequest = {
      includedTypes: ["restaurant"],
      maxResultCount: requestedCount,
      locationRestriction: {
        circle: {
          center: {
            latitude: parseFloat(lat),
            longitude: parseFloat(lng),
          },
          radius: parseFloat(radius),
        },
      },
      rankPreference: "DISTANCE",
      languageCode: "ca", // Catalan results where available
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
        revalidate: 3600,
        tags: [
          "places",
          `places:${lat}:${lng}`,
          eventDateISO ? `places:date:${eventDateISO}` : "places:date:none",
        ],
      },
    });

    const data: GooglePlacesSearchNearbyRawResponse = await response.json();

    if (!response.ok) {
      console.error("Google Places API error:", response.status, data);
      return NextResponse.json(
        { error: "Places API error", status: response.status, details: data },
        { status: 500 }
      );
    }

    const places = Array.isArray(data.places) ? data.places : [];

    const filtered = places.filter((place: GooglePlaceResponse) => {
      if (!isOperational(place)) return false;
      if (!eventDateISO) return true;

      if (place.currentOpeningHours?.periods?.length) {
        if (isOpenOnDateUsingCurrentHours(place, eventDateISO)) return true;
      }
      return isOpenOnDateUsingRegularHours(place, eventDateISO);
    });

    const limitedResults = filtered
      .slice(0, limit)
      .map((place: GooglePlaceResponse) => {
        const placeId = place.name?.replace("places/", "") || "";
        const isOpenOnEventDay =
          eventDateISO &&
          (isOpenOnDateUsingCurrentHours(place, eventDateISO) ||
            isOpenOnDateUsingRegularHours(place, eventDateISO));

        const confirmedByCurrent =
          !!eventDateISO && isOpenOnDateUsingCurrentHours(place, eventDateISO);
        const open_confidence: OpenConfidence | undefined = !eventDateISO
          ? undefined
          : confirmedByCurrent
          ? "confirmed"
          : isOpenOnEventDay
          ? "inferred"
          : "none";

        const { info: opening_info, weekdayText } = buildOpeningInfo(
          place,
          eventDateISO
        );
        // attach open_confidence into structured object for future formatting
        if (open_confidence) {
          opening_info.open_confidence = open_confidence;
        }

        const addressLines = place.postalAddress?.addressLines;
        const locality = place.postalAddress?.locality;
        const adminArea = place.postalAddress?.administrativeArea;
        const postalCode = place.postalAddress?.postalCode;

        return {
          place_id: placeId,
          name: place.displayName?.text || "Restaurant",
          vicinity: place.formattedAddress || "Localització no disponible", // deprecated; prefer address_lines
          address_lines: addressLines,
          address_locality: locality,
          address_administrative_area: adminArea,
          address_postal_code: postalCode,
          rating: place.rating,
          price_level: place.priceLevel ?? undefined,
          types: place.types || [],
          geometry: {
            location: {
              lat: place.location?.latitude || 0,
              lng: place.location?.longitude || 0,
            },
          },
          photos: place.photos?.slice(0, 1) || undefined,
          business_status: place.businessStatus,
          is_open_on_event_day: isOpenOnEventDay ?? undefined,
          opening_info,
          raw_weekday_text:
            weekdayText && weekdayText.length ? weekdayText : undefined,
        };
      });

    return NextResponse.json({
      results: limitedResults,
      status: "OK",
      attribution: "Powered by Google",
    });
  } catch (error: unknown) {
    console.error("Error fetching places:", error);
    return NextResponse.json(
      { error: "Failed to fetch places" },
      { status: 500 }
    );
  }
}
