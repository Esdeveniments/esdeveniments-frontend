"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslations } from "next-intl";
import type { PlaceOption, PlaceSelectorProps } from "types/sponsor";
import { SPONSOR_POPULAR_PLACES } from "@utils/constants";
import { normalizeForSearch } from "@utils/string-helpers";
import {
  MapPinIcon,
  CheckIcon,
  XMarkIcon,
  EyeIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

// Re-export for convenience
export type { PlaceOption };

// Catalunya option slug - name is localized via translations
const CATALUNYA_SLUG = "catalunya";

/**
 * Type guard to validate place data from API
 */
function isValidPlace(p: unknown): p is { slug: string; name: string } {
  return (
    typeof p === "object" &&
    p !== null &&
    typeof (p as Record<string, unknown>).slug === "string" &&
    typeof (p as Record<string, unknown>).name === "string"
  );
}

/**
 * Searchable place selector with regions and cities.
 * Fetches data from our API and provides autocomplete.
 */
export default function PlaceSelector({
  onPlaceSelect,
  selectedPlace,
}: PlaceSelectorProps) {
  const t = useTranslations("Patrocina");
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [places, setPlaces] = useState<PlaceOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch places on mount
  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    async function fetchPlaces() {
      try {
        // Fetch regions and cities in parallel with timeout
        const [regionsRes, citiesRes] = await Promise.all([
          fetch("/api/regions", { signal: controller.signal }),
          fetch("/api/cities", { signal: controller.signal }),
        ]);

        const regionsData = regionsRes.ok ? await regionsRes.json() : [];
        const citiesData = citiesRes.ok ? await citiesRes.json() : [];

        // Filter and validate API responses
        const regions = Array.isArray(regionsData)
          ? regionsData.filter(isValidPlace)
          : [];
        const cities = Array.isArray(citiesData)
          ? citiesData.filter(isValidPlace)
          : [];

        const allPlaces: PlaceOption[] = [
          // Regions first (comarques)
          ...regions.map(
            (r): PlaceOption => ({
              slug: r.slug,
              name: r.name,
              type: "region",
            })
          ),
          // Then cities/towns
          ...cities.map(
            (c): PlaceOption => ({
              slug: c.slug,
              name: c.name,
              type: "town",
            })
          ),
        ];

        setPlaces(allPlaces);
      } catch (error) {
        // Ignore abort errors (expected on unmount or timeout)
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        console.error("Failed to fetch places:", error);
      } finally {
        clearTimeout(timeoutId);
        setIsLoading(false);
      }
    }

    fetchPlaces();

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  // Filter places based on query (accent-insensitive)
  const filteredPlaces = useMemo(() => {
    if (!query.trim()) return places.slice(0, 20); // Show first 20 by default

    const normalizedQuery = normalizeForSearch(query);
    return places
      .filter((place) =>
        normalizeForSearch(place.name).includes(normalizedQuery)
      )
      .slice(0, 20);
  }, [places, query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (place: PlaceOption) => {
    onPlaceSelect(place);
    setQuery("");
    setIsOpen(false);
  };

  const handleClear = () => {
    onPlaceSelect(null);
    setQuery("");
  };

  const handlePopularClick = (place: PlaceOption) => {
    // Find the full place data (in case it has more info)
    const fullPlace = places.find((p) => p.slug === place.slug) || place;
    handleSelect(fullPlace);
  };

  const handleCatalunyaSelect = () => {
    const catalunyaOption: PlaceOption = {
      slug: CATALUNYA_SLUG,
      name: t("placeSelector.catalunya.title"),
      type: "country",
    };
    onPlaceSelect(catalunyaOption);
  };

  // Helper to get type label
  const getTypeLabel = (type: PlaceOption["type"]) => {
    switch (type) {
      case "country":
        return t("placeSelector.country");
      case "region":
        return t("placeSelector.region");
      default:
        return t("placeSelector.city");
    }
  };

  return (
    <div className="w-full">
      <label className="body-normal font-medium text-foreground mb-2 flex items-center gap-2">
        <MapPinIcon className="h-5 w-5 text-primary" />
        {t("placeSelector.label")}
      </label>

      {selectedPlace ? (
        // Selected state
        <div className="card-bordered p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckIcon className="h-5 w-5 text-green-600" />
              <span className="font-medium">{selectedPlace.name}</span>
              <span className="badge-default text-xs">
                {getTypeLabel(selectedPlace.type)}
              </span>
            </div>
            <button
              onClick={handleClear}
              className="text-foreground/50 hover:text-foreground p-1"
              aria-label={t("placeSelector.clear")}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <p className="body-small text-foreground/60 mt-2 flex items-center gap-1">
            <EyeIcon className="h-4 w-4" />
            {t("placeSelector.preview")}{" "}
            <span className="text-primary font-medium">
              esdeveniments.cat/{selectedPlace.slug}
            </span>
          </p>
        </div>
      ) : (
        // Search state
        <div className="space-y-4">
          {/* Catalunya option - Maximum visibility */}
          <button
            onClick={handleCatalunyaSelect}
            className="w-full text-left card-bordered p-4 hover:border-primary hover:bg-primary/5 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GlobeAltIcon className="h-8 w-8 text-primary" />
                <div>
                  <div className="font-medium text-foreground group-hover:text-primary">
                    {t("placeSelector.catalunya.title")}
                  </div>
                  <div className="body-small text-foreground/60">
                    {t("placeSelector.catalunya.subtitle")}
                  </div>
                </div>
              </div>
              <span className="badge-primary text-xs">
                {t("placeSelector.catalunya.badge")}
              </span>
            </div>
          </button>

          {/* Divider with "or" */}
          <div className="flex items-center gap-3 text-foreground/50">
            <div className="flex-1 h-px bg-border" />
            <span className="body-small">{t("placeSelector.orSpecific")}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Search input */}
          <div className="relative">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground/50" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                placeholder={t("placeSelector.placeholder")}
                className="w-full pl-10 pr-4 py-3 rounded-input border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                disabled={isLoading}
              />
            </div>

            {/* Dropdown */}
            {isOpen && !isLoading && (
              <div
                ref={dropdownRef}
                className="absolute z-50 w-full mt-1 bg-background border border-border rounded-card shadow-lg max-h-60 overflow-auto"
              >
                {filteredPlaces.length > 0 ? (
                  filteredPlaces.map((place) => (
                    <button
                      key={`${place.type}-${place.slug}`}
                      onClick={() => handleSelect(place)}
                      className="w-full px-4 py-2 text-left hover:bg-muted flex items-center justify-between gap-2"
                    >
                      <span>{place.name}</span>
                      <span className="text-xs text-foreground/50">
                        {getTypeLabel(place.type)}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-foreground/50 text-center">
                    {t("placeSelector.noResults")}
                  </div>
                )}
              </div>
            )}

            {/* Popular places */}
            <div className="mt-3">
              <span className="body-small text-foreground/60">
                {t("placeSelector.popular")}:{" "}
              </span>
              <div className="inline-flex flex-wrap gap-2 mt-1">
                {SPONSOR_POPULAR_PLACES.map((place) => (
                  <button
                    key={place.slug}
                    onClick={() => handlePopularClick(place)}
                    className="text-sm text-primary hover:text-primary/80 hover:underline"
                    disabled={isLoading}
                  >
                    {place.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
