import { getRegionValue, getTownValue } from "@utils/form-helpers";
import { normalizeUrl, slugifySegment } from "@utils/string-helpers";
import type { CitySummaryResponseDTO } from "types/api/city";
import type { EventDetailResponseDTO, RegionSummaryResponseDTO } from "types/api/event";
import type { CategorySummaryResponseDTO } from "types/api/category";
import type { FormData } from "types/event";
import type { Option } from "types/common";

const buildRegionMeta = (
  region: FormData["region"]
): RegionSummaryResponseDTO | undefined => {
  const regionIdValue = getRegionValue(region);
  if (!region && !regionIdValue) return undefined;

  if (region && "id" in region) {
    const fallbackLabel = (region as { label?: string }).label;
    const name = region.name ?? fallbackLabel ?? "";
    return {
      id: Number(region.id),
      name,
      slug: region.slug ?? slugifySegment(name) ?? "",
    };
  }

  if (region && "value" in region) {
    const name = region.label ?? `Comarca ${region.value}`;
    return {
      id: Number(region.value),
      name,
      slug: slugifySegment(name) || `comarca-${region.value}`,
    };
  }

  const fallbackName = regionIdValue ? `Comarca ${regionIdValue}` : "Comarca";
  return {
    id: regionIdValue ? Number(regionIdValue) : 0,
    name: fallbackName,
    slug: slugifySegment(fallbackName) || "comarca",
  };
};

const buildCityMeta = (
  town: FormData["town"]
): CitySummaryResponseDTO | undefined => {
  const townIdValue = getTownValue(town);
  if (!town && !townIdValue) return undefined;

  if (town && "name" in (town as CitySummaryResponseDTO)) {
    const city = town as CitySummaryResponseDTO;
    return {
      ...city,
      id: Number(city.id),
      slug: city.slug || slugifySegment(city.name) || `ciutat-${city.id}`,
    };
  }

  if (town && "value" in (town as Option)) {
    const option = town as Option;
    const name = option.label ?? `Ciutat ${option.value}`;
    return {
      id: Number(option.value),
      name,
      slug: slugifySegment(name) || `ciutat-${option.value}`,
      latitude: option.latitude ?? 0,
      longitude: option.longitude ?? 0,
      postalCode: "",
      rssFeed: null,
      enabled: true,
    };
  }

  const fallbackName = townIdValue ? `Ciutat ${townIdValue}` : "Ciutat";
  return {
    id: townIdValue ? Number(townIdValue) : 0,
    name: fallbackName,
    slug: slugifySegment(fallbackName) || "ciutat",
    latitude: 0,
    longitude: 0,
    postalCode: "",
    rssFeed: null,
    enabled: true,
  };
};

const buildCategoriesMeta = (
  categories: FormData["categories"]
): CategorySummaryResponseDTO[] => {
  if (!Array.isArray(categories)) return [];

  return categories
    .map((category, index) => {
      if (
        category &&
        typeof category === "object" &&
        "id" in category &&
        "name" in category
      ) {
        const slug =
          slugifySegment(category.name) ||
          `categoria-${category.id || index + 1}`;
        return {
          id: Number(category.id) || index + 1,
          name: category.name,
          slug,
        };
      }
      if (category && typeof category === "object" && "value" in category) {
        const numericId = Number(category.value) || index + 1;
        const slug =
          slugifySegment(category.label) ||
          `categoria-${numericId || index + 1}`;
        return {
          id: numericId,
          name: category.label,
          slug,
        };
      }
      if (typeof category === "number") {
        return {
          id: category,
          name: `Categoria ${category}`,
          slug: `categoria-${category}`,
        };
      }
      return null;
    })
    .filter((category): category is CategorySummaryResponseDTO =>
      Boolean(category)
    );
};

const parseDate = (value: string): Date | null => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const extractDate = (value: string, fallback: Date): string => {
  const parsed = parseDate(value) || fallback;
  return parsed.toISOString().slice(0, 10);
};

const extractTime = (value: string): string | null => {
  const parsed = parseDate(value);
  if (!parsed) return null;
  return parsed.toISOString().slice(11, 16);
};

export const mapDraftToPreviewEvent = ({
  form,
  imageUrl,
}: {
  form: FormData;
  imageUrl: string | null;
}): EventDetailResponseDTO => {
  const now = new Date();
  const safeTitle = form.title?.trim() || "Esdeveniment";
  const slug = slugifySegment(safeTitle) || "esdeveniment";

  const startDate = extractDate(form.startDate, now);
  const endDate = extractDate(form.endDate || form.startDate, now);
  const startTime = form.startTime || extractTime(form.startDate);
  const endTime = form.endTime || extractTime(form.endDate || form.startDate);

  const region = buildRegionMeta(form.region);
  const city = buildCityMeta(form.town);
  const province = region
    ? {
        id: region.id,
        name: region.name,
        slug: region.slug,
      }
    : undefined;

  const normalizedUrl = normalizeUrl(form.url) || form.url || "";

  const categories = buildCategoriesMeta(form.categories);

  return {
    id: "preview",
    hash: "preview",
    slug,
    title: safeTitle,
    type: form.type || "FREE",
    url: normalizedUrl,
    description: form.description || "",
    imageUrl: imageUrl || form.imageUrl || "",
    startDate,
    startTime,
    endDate,
    endTime,
    location: form.location || "",
    visits: 0,
    origin: "MANUAL",
    city: city || {
      id: 0,
      name: "",
      slug: "",
      latitude: 0,
      longitude: 0,
      postalCode: "",
      rssFeed: null,
      enabled: true,
    },
    region: region || {
      id: 0,
      name: "",
      slug: "",
    },
    province:
      province ||
      (region
        ? {
            id: region.id,
            name: region.name,
            slug: region.slug,
          }
        : {
            id: 0,
            name: "",
            slug: "",
          }),
    categories,
  };
};




