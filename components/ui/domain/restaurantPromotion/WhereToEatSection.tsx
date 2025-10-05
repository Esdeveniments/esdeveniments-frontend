import { WhereToEatSectionProps, GooglePlace } from "types/api/restaurant";
import NextImage from "next/image";
import { FireIcon } from "@heroicons/react/outline"; // using FireIcon as dining marker (no direct utensils icon in outline set v1)
import { getOptimalImageQuality } from "@utils/image-quality";
import {
  formatPriceLevelGeneric,
  getOpenLineInfo,
  formatAddressLines,
} from "@utils/place-format";
import { Text } from "@components/ui/primitives";

// Helper: derive photo proxy URL (Places API v1 only)
function getPhotoUrl(place: GooglePlace): string | null {
  const photo = place.photos?.[0];
  if (!photo) return null;
  return `/api/places/photo?name=${encodeURIComponent(photo.name)}&w=160`;
}

export default function WhereToEatSection({
  places,
  attribution,
  onPromoteClick,
}: WhereToEatSectionProps) {
  if (!places || places.length === 0) {
    return null;
  }

  return (
    <>
      <FireIcon className="mt-component-xs h-5 w-5" aria-hidden="true" />
      <section
        className="flex w-11/12 flex-col gap-component-md"
        aria-labelledby="where-to-eat"
      >
        <div className="flex items-center justify-between gap-component-xs">
          <Text as="h2" id="where-to-eat" variant="h2" className="flex-1">
            On pots menjar
          </Text>
          {onPromoteClick && (
            <button
              type="button"
              onClick={onPromoteClick}
              className="font-medium text-primary underline hover:text-primarydark focus:outline-none"
            >
              Promociona el teu restaurant
            </button>
          )}
        </div>
        <div className="space-y-3">
          {places.slice(0, 3).map((place: GooglePlace) => {
            const openInfo = getOpenLineInfo(place);
            const price = formatPriceLevelGeneric(place.price_level);
            const shortAddress =
              formatAddressLines(place.address_lines) || place.vicinity;
            return (
              <a
                key={place.place_id}
                href={`https://www.google.com/maps/place/?q=place_id:${place.place_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-lg border border-bColor/50 py-component-md pl-xs pr-component-md transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40"
                aria-label={`Obrir ${place.name} a Google Maps`}
              >
                <div className="flex items-start gap-component-md">
                  {getPhotoUrl(place) ? (
                    <div className="relative ml-component-md h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-darkCorp">
                      <NextImage
                        src={getPhotoUrl(place)!}
                        alt={`Foto de ${place.name}`}
                        fill
                        priority={false}
                        sizes="80px"
                        quality={getOptimalImageQuality({ isExternal: true })}
                        className="object-cover"
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                  ) : (
                    <div className="ml-component-md flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-md bg-darkCorp text-blackCorp/40">
                      <svg
                        className="h-8 w-8"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />
                      </svg>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-component-xs">
                      <Text
                        as="h3"
                        variant="h3"
                        className="line-clamp-1 min-w-0 group-hover:underline"
                      >
                        {place.name}
                      </Text>
                      <svg
                        className="h-4 w-4 flex-shrink-0 text-primary opacity-70 group-hover:opacity-100"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </div>
                    <Text
                      as="p"
                      variant="body-sm"
                      className="mt-component-xs line-clamp-2 text-blackCorp/80"
                    >
                      {shortAddress}
                    </Text>
                    <Text
                      as="p"
                      variant="caption"
                      color="black"
                      className="mt-component-xs flex flex-wrap items-center gap-component-xs"
                    >
                      {openInfo?.hoursText && <span>{openInfo.hoursText}</span>}
                      {openInfo?.hoursText && openInfo?.openLabel && (
                        <span className="text-blackCorp/50">·</span>
                      )}
                      {openInfo?.openLabel && (
                        <span className={openInfo.toneClass}>
                          {openInfo.openLabel}
                        </span>
                      )}
                      {(openInfo?.hoursText || openInfo?.openLabel) &&
                        (place.rating || price) && (
                          <span className="text-blackCorp/50">·</span>
                        )}
                      {place.rating && (
                        <span className="flex items-center gap-xs text-blackCorp">
                          <span className="text-warning/80">★</span>
                          {place.rating.toFixed(1)}
                        </span>
                      )}
                      {place.rating && price && (
                        <span className="text-blackCorp/50">·</span>
                      )}
                      {price && <span className="text-blackCorp">{price}</span>}
                    </Text>
                  </div>
                </div>
              </a>
            );
          })}
        </div>

        {/* Attribution */}
        <div className="border-t border-bColor/50 pt-component-xs">
          <Text variant="caption" color="muted">
            {attribution}
          </Text>
        </div>
      </section>
    </>
  );
}
