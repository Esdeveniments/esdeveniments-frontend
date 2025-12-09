// Re-export all helper functions from their respective modules for backward compatibility

// Date helpers
export {
  isLessThanFiveDays,
  convertTZ,
  getFormattedDate,
  nextDay,
  isWeekend,
  parseTimeToEventTimeDTO,
  toLocalDateString,
} from "./date-helpers";

// String helpers
export {
  sanitize,
  slug,
  truncateString,
  formatCatalanDe,
  formatCatalanA,
  capitalizeFirstLetter,
  formatPlaceName,
} from "./string-helpers";
export {
  buildEventIntroText,
  buildFaqItems,
  buildFaqJsonLd,
} from "./event-copy";

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
  findCategoryBySlugDynamic,
  getCategoryFromDynamicData,
  getCategoryId,
  getCategoryDisplayName,
} from "./category-helpers";

// Location helpers
export {
  getPlaceTypeAndLabel,
  getPlaceTypeAndLabelCached,
  getDistance,
  deg2rad,
  getNewsCta,
} from "./location-helpers";

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
