// Re-export all helper functions from their respective modules for backward compatibility

// Date helpers
export {
  isLessThanFiveDays,
  convertTZ,
  getFormattedDate,
  nextDay,
  isWeekend,
  monthsName,
  parseTimeToEventTimeDTO,
  toLocalDateString,
} from "./date-helpers";

// String helpers
export { sanitize, slug, truncateString } from "./string-helpers";

// Text processing helpers
export { processDescription } from "./text-processing";

// Form helpers
export {
  getRegionValue,
  getTownValue,
  formDataToBackendDTO,
  eventDtoToFormData,
} from "./form-helpers";

// Category helpers
export {
  findCategoryKeyByValue,
  findCategoryBySlugDynamic,
  getCategoryFromDynamicData,
  getCategoryId,
  getCategoryDisplayName,
} from "./category-helpers";

// Location helpers
export { getPlaceTypeAndLabel, getDistance, deg2rad } from "./location-helpers";

// Schema helpers
export { generateJsonData } from "./schema-helpers";

// Options helpers
export {
  generateRegionsOptions,
  generateTownsOptions,
  generateRegionsAndTownsOptions,
} from "./options-helpers";

// Miscellaneous helpers
export { sendEventToGA, env, getRegionFromQuery } from "./misc-helpers";
