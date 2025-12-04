import { WhereToEatSectionProps, GooglePlace } from "types/api/restaurant";
import NextImage from "next/image";
import { FireIcon } from "@heroicons/react/outline"; // using FireIcon as dining marker (no direct utensils icon in outline set v1)
import { getOptimalImageQuality } from "@utils/image-quality";
import {
  formatPriceLevelGeneric,
  getOpenLineInfo,
  formatAddressLines,
} from "@utils/place-format";
import SectionHeading from "@components/ui/common/SectionHeading";
import { withImageCacheKey } from "@utils/image-cache";
import { siteUrl } from "@config/index";

// Helper: derive photo proxy URL (Places API v1 only)
function getPhotoUrl(place: GooglePlace): string | null {
  const photo = place.photos?.[0];
  if (!photo) return null;
  const basePath = `/api/places/photo?name=${encodeURIComponent(
    photo.name
  )}&w=160`;
  return `${siteUrl}${basePath}`;
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
    <section className="stack w-full min-w-0" aria-labelledby="where-to-eat">
      <div className="flex items-center justify-between gap-element-gap">
        <SectionHeading
          headingId="where-to-eat"
          Icon={FireIcon}
          iconClassName="w-5 h-5 text-foreground-strong flex-shrink-0"
          title="On pots menjar"
          titleClassName="heading-2"
        />
        {onPromoteClick && (
          <button
            type="button"
            onClick={onPromoteClick}
            className="text-xs font-medium text-primary hover:text-primary-dark underline focus:outline-none"
          >
            Promociona el teu restaurant
          </button>
        )}
      </div>
      <div className="space-y-element-gap  px-section-x">
        {places.slice(0, 3).map((place: GooglePlace) => {
          const openInfo = getOpenLineInfo(place);
          const price = formatPriceLevelGeneric(place.price_level);
          const shortAddress =
            formatAddressLines(place.address_lines) || place.vicinity;
          // Google Maps requires both query and query_place_id parameters
          // query serves as fallback if place_id is not found
          const encodedPlaceName = encodeURIComponent(place.name);
          return (
            <a
              key={place.place_id}
              href={`https://www.google.com/maps/search/?api=1&query=${encodedPlaceName}&query_place_id=${place.place_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group block border border-border rounded-lg pr-4 py-4 pl-0 hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/40"
              aria-label={`Obrir ${place.name} a Google Maps`}
            >
              <div className="flex items-start gap-4">
                {(() => {
                  const photoUrl = getPhotoUrl(place);
                  if (!photoUrl) {
                    return (
                      <div className="w-20 h-20 rounded-md flex items-center justify-center bg-muted text-foreground/60 flex-shrink-0 ml-4">
                        <svg
                          className="w-8 h-8"
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
                    );
                  }
                  const normalizedPhotoUrl = withImageCacheKey(
                    photoUrl,
                    place.place_id || place.name
                  );
                  return (
                    <div className="relative w-20 h-20 rounded-md overflow-hidden flex-shrink-0 bg-muted ml-4">
                      <NextImage
                        src={normalizedPhotoUrl}
                        alt={`Foto de ${place.name}`}
                        fill
                        priority={false}
                        sizes="80px"
                        quality={getOptimalImageQuality({ isExternal: true })}
                        className="object-cover"
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                  );
                })()}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-foreground-strong line-clamp-1 group-hover:underline min-w-0">
                      {place.name}
                    </h3>
                    <svg
                      className="h-4 w-4 text-primary opacity-70 group-hover:opacity-100 flex-shrink-0"
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
                  <p className="text-sm text-foreground/80 mt-1 line-clamp-2">
                    {shortAddress}
                  </p>
                  <p className="mt-2 text-xs flex flex-wrap items-center gap-2 text-foreground">
                    {openInfo?.hoursText && <span>{openInfo.hoursText}</span>}
                    {openInfo?.hoursText && openInfo?.openLabel && (
                      <span className="text-foreground/40">·</span>
                    )}
                    {openInfo?.openLabel && (
                      <span className={openInfo.toneClass}>
                        {openInfo.openLabel}
                      </span>
                    )}
                    {(openInfo?.hoursText || openInfo?.openLabel) &&
                      (place.rating || price) && (
                        <span className="text-foreground/40">·</span>
                      )}
                    {place.rating && (
                      <span className="text-foreground flex items-center gap-1">
                        <span className="text-yellow-500">★</span>
                        {place.rating.toFixed(1)}
                      </span>
                    )}
                    {place.rating && price && (
                      <span className="text-foreground/40">·</span>
                    )}
                    {price && <span className="text-foreground">{price}</span>}
                  </p>
                </div>
              </div>
            </a>
          );
        })}
      </div>

      {/* Attribution */}
      <div className="text-xs text-foreground/70 pt-2 border-t border-border/30">
        {attribution}
      </div>
    </section>
  );
}
