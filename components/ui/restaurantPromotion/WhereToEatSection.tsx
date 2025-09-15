import { WhereToEatSectionProps } from "types/api/restaurant";

export default function WhereToEatSection({
  places,
  attribution,
}: WhereToEatSectionProps) {
  if (!places || places.length === 0) {
    return null;
  }

  return (
    <div className="w-full flex justify-center items-start gap-2 px-4">
      <svg
        className="w-5 h-5 mt-1"
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
      <section
        className="w-11/12 flex flex-col gap-4"
        aria-labelledby="where-to-eat"
      >
        <h2 id="where-to-eat">On pots menjar</h2>
        <div className="space-y-3">
          {places.slice(0, 3).map((place: GooglePlace) => (
            <div
              key={place.place_id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{place.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{place.vicinity}</p>

                  {/* Rating */}
                  {place.rating && (
                    <div className="flex items-center mt-2">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`h-4 w-4 ${
                              i < Math.floor(place.rating!)
                                ? "text-yellow-400"
                                : "text-gray-300"
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className="ml-1 text-sm text-gray-600">
                        {place.rating.toFixed(1)}
                      </span>
                    </div>
                  )}

                  {/* Price Level */}
                  {place.price_level !== undefined && (
                    <div className="mt-1">
                      <span className="text-sm text-gray-600">
                        {place.price_level === 0 && "€"}
                        {place.price_level === 1 && "€€"}
                        {place.price_level === 2 && "€€€"}
                        {place.price_level === 3 && "€€€€"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Google Maps Link */}
                <a
                  href={`https://www.google.com/maps/place/?q=place_id:${place.place_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-4 text-primary hover:text-primarydark transition-colors"
                  aria-label={`View ${place.name} on Google Maps`}
                >
                  <svg
                    className="h-5 w-5"
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
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Attribution */}
        <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-100">
          {attribution}
        </div>
      </section>
    </div>
  );
}
