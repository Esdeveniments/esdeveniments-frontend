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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");
  const radiusStr = searchParams.get("radius") || "5000";
  const limitStr = searchParams.get("limit") || "3";
  const rawDate = searchParams.get("date"); // YYYY-MM-DD in place-local calendar

  // Validate coordinates
  const lat = latStr ? parseFloat(latStr) : NaN;
  const lng = lngStr ? parseFloat(lngStr) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "Invalid coordinates: lat,lng must be numbers" },
      { status: 400 }
    );
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json(
      { error: "Invalid coordinates: lat ∈ [-90,90], lng ∈ [-180,180]" },
      { status: 400 }
    );
  }

  // Clamp radius (meters)
  const radiusNum = parseFloat(radiusStr);
  const radius = Number.isFinite(radiusNum)
    ? Math.min(Math.max(radiusNum, 100), 50000)
    : 5000;

  // Clamp limit
  const limitNum = parseInt(limitStr, 10);
  const limit = Number.isFinite(limitNum)
    ? Math.min(Math.max(limitNum, 1), 6)
    : 3;

  // Sanitize optional date (YYYY-MM-DD) with calendar validation
  let eventDateISO: string | null = null;
  if (rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    const candidate = `${rawDate}T00:00:00.000Z`;
    const parsed = new Date(candidate);
    if (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().startsWith(rawDate)
    ) {
      eventDateISO = rawDate;
    }
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error("GOOGLE_PLACES_API_KEY is not configured");
    return NextResponse.json(
      { error: "Places API not configured" },
      { status: 500 }
    );
  }

  // --- Helpers (consolidated) ---
  function toISODate(point?: PlaceOpeningHoursPoint): string | undefined {
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

  function periodIncludesDate(
    p: PlaceOpeningHoursPeriod,
    iso: string
  ): boolean {
    const openISO = toISODate(p.open);
    const closeISO = toISODate(p.close);
    if (!openISO && !closeISO) return false;
    if (openISO === iso || closeISO === iso) return true;
    if (openISO && closeISO) return openISO < iso && closeISO > iso;
    return false;
  }

  function isOpenOnDate(place: GooglePlaceResponse, iso: string): boolean {
    // prefer currentOpeningHours date-bounded periods when present
    const current = place.currentOpeningHours?.periods;
    if (current?.some((p) => periodIncludesDate(p, iso))) return true;

    // fallback to regular weekly schedule (day-based)
    const regular = place.regularOpeningHours?.periods;
    if (!regular?.length) return false;
    const wd = new Date(`${iso}T12:00:00`).getDay(); // 0=Sun..6=Sat
    return regular.some((p) => {
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

  function to24h(input: string): string {
    const t = input.trim();
    // 24h "HH:MM"
    let m = t.match(/^(\d{1,2}):(\d{2})$/);
    if (m) {
      const h = String(parseInt(m[1], 10)).padStart(2, "0");
      const mm = m[2];
      return `${h}:${mm}`;
    }
    // "H:MM AM/PM" or "HMMAM" variants
    m = t.match(/^(\d{1,2}):?(\d{2})?\s*(AM|PM)$/i);
    if (m) {
      const hRaw = m[1];
      const mRaw = m[2] ?? "00";
      let h = parseInt(hRaw, 10);
      const ap = m[3].toUpperCase();
      if (ap === "AM" && h === 12) h = 0;
      if (ap === "PM" && h !== 12) h += 12;
      return `${String(h).padStart(2, "0")}:${String(mRaw).padStart(2, "0")}`;
    }
    // "H AM/PM"
    m = t.match(/^(\d{1,2})\s*(AM|PM)$/i);
    if (m) {
      let h = parseInt(m[1], 10);
      const ap = m[2].toUpperCase();
      if (ap === "AM" && h === 12) h = 0;
      if (ap === "PM" && h !== 12) h += 12;
      return `${String(h).padStart(2, "0")}:00`;
    }
    return t;
  }

  function getSource(place: GooglePlaceResponse): "current" | "regular" {
    return place.currentOpeningHours?.periods?.length ? "current" : "regular";
  }

  function buildOpeningInfo(
    place: GooglePlaceResponse,
    isoDate: string | null
  ): { info: OpeningInfo; weekdayText?: string[] } {
    const weekdayText =
      place.currentOpeningHours?.weekdayDescriptions ||
      place.regularOpeningHours?.weekdayDescriptions ||
      [];

    // Event date path: try explicit periods first (current or regular), then fallback to weekday text
    if (isoDate) {
      const periods = place.currentOpeningHours?.periods?.length
        ? place.currentOpeningHours.periods
        : place.regularOpeningHours?.periods;
      const segments: OpeningSegment[] = [];
      if (periods) {
        for (const p of periods) {
          if (periodIncludesDate(p, isoDate)) {
            if (p.open) {
              const start = `${String(p.open.hour ?? 0).padStart(
                2,
                "0"
              )}:${String(p.open.minute ?? 0).padStart(2, "0")}`;
              let end = "";
              let overnight = false;
              if (p.close) {
                end = `${String(p.close.hour ?? 0).padStart(2, "0")}:${String(
                  p.close.minute ?? 0
                ).padStart(2, "0")}`;
                const openDate = toISODate(p.open);
                const closeDate = toISODate(p.close);
                overnight = !!(openDate && closeDate && openDate !== closeDate);
              } else {
                end = "24:00";
              }
              segments.push({
                start,
                end,
                overnight,
                source: getSource(place),
              });
            }
          }
        }
      }

      if (segments.length) {
        return {
          info: {
            open_status: "unknown",
            segments,
            event_date: isoDate,
            source: segments[0].source,
            is_24h:
              segments.length === 1 &&
              segments[0].start === "00:00" &&
              (segments[0].end === "24:00" || segments[0].end === "00:00"),
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

        if (
          afterColon.toLowerCase().includes("closed") ||
          afterColon.toLowerCase().includes("cerrat")
        ) {
          return {
            info: {
              open_status: "closed",
              event_date: isoDate,
              source: getSource(place),
            },
            weekdayText,
          };
        }

        const parts = afterColon.split(/[–—-]|to/i).map((p) => p.trim());
        if (parts.length === 2) {
          const start = to24h(parts[0]);
          const end = to24h(parts[1]);
          if (/^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end)) {
            return {
              info: {
                open_status: "unknown",
                segments: [
                  {
                    start,
                    end,
                    overnight: start > end,
                    source: getSource(place),
                  },
                ],
                event_date: isoDate,
                source: getSource(place),
                is_24h:
                  start === "00:00" && (end === "24:00" || end === "00:00"),
              },
              weekdayText,
            };
          }
        }

        return {
          info: {
            open_status: "unknown",
            event_date: isoDate,
            source: getSource(place),
          },
          weekdayText,
        };
      }

      return {
        info: { open_status: "unknown", event_date: isoDate },
        weekdayText,
      };
    }

    // No event date: treat as 'today' UX (open_now + weekday line)
    if (weekdayText.length) {
      const todayIdx = new Date().getDay();
      const line = weekdayText[todayIdx];
      if (line) {
        const afterColon = line.includes(":")
          ? line.substring(line.indexOf(":") + 1).trim()
          : line;
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
                source: getSource(place),
              },
            ],
            source: getSource(place),
            is_24h: start === "00:00" && (end === "24:00" || end === "00:00"),
          };
          return { info, weekdayText };
        }
        return { info: { open_status: "unknown" }, weekdayText };
      }
    }

    return { info: { open_status: "unknown" }, weekdayText };
  }

  // --- Main fetch + transform ---
  try {
    const fields = [
      "places.name",
      "places.displayName",
      "places.formattedAddress",
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
          center: { latitude: lat, longitude: lng },
          radius,
        },
      },
      rankPreference: "DISTANCE",
      languageCode: "ca",
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
      // prefer current periods for exact-date checks, otherwise evaluate regular schedule
      const hasCurrentPeriods = !!place.currentOpeningHours?.periods?.length;
      if (hasCurrentPeriods) {
        return place.currentOpeningHours!.periods!.some((p) =>
          periodIncludesDate(p, eventDateISO)
        );
      }
      return isOpenOnDate(place, eventDateISO);
    });

    const limitedResults = filtered
      .slice(0, limit)
      .map((place: GooglePlaceResponse) => {
        const placeId = place.name?.replace("places/", "") || "";
        const confirmedByCurrent =
          !!eventDateISO &&
          !!place.currentOpeningHours?.periods?.some((p) =>
            periodIncludesDate(p, eventDateISO)
          );
        const isOpenOnEventDay =
          !!eventDateISO &&
          (confirmedByCurrent || isOpenOnDate(place, eventDateISO));

        const open_confidence: OpenConfidence | undefined = !eventDateISO
          ? undefined
          : confirmedByCurrent
          ? "confirmed"
          : isOpenOnDate(place, eventDateISO)
          ? "inferred"
          : "none";

        const { info: opening_info, weekdayText } = buildOpeningInfo(
          place,
          eventDateISO ?? null
        );
        if (open_confidence) opening_info.open_confidence = open_confidence;

        const addressLines = place.postalAddress?.addressLines;
        const locality = place.postalAddress?.locality;
        const adminArea = place.postalAddress?.administrativeArea;
        const postalCode = place.postalAddress?.postalCode;

        return {
          place_id: placeId,
          name: place.displayName?.text || "Restaurant",
          vicinity: place.formattedAddress || "Localització no disponible",
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

    return NextResponse.json(
      {
        results: limitedResults,
        status: "OK",
        attribution: "Powered by Google",
      },
      {
        status: 200,
        headers: {
          // Edge/CDN cache for 5 minutes, serve stale while revalidating
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300",
        },
      }
    );
  } catch (error: unknown) {
    console.error("Error fetching places:", error);
    return NextResponse.json(
      { error: "Failed to fetch places" },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
