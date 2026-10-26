import { getTownValue } from "./helpers";
import { toLocalDateTimeString } from "./date-helpers";
import type { FormData } from "types/event";
import type { Option } from "types/common";
import type { PublishDraftWarning } from "types/publish-draft";

export function getPublishDraftWarnings(
  form: FormData,
  cityOptions: Option[],
  categoryOptions: Option[],
  citiesReady: boolean,
  categoriesReady: boolean,
): PublishDraftWarning[] {
  const warnings: PublishDraftWarning[] = [];
  const today = toLocalDateTimeString(new Date()).slice(0, 10);
  if (form.startDate && form.startDate.slice(0, 10) < today) warnings.push("date");
  const town = getTownValue(form.town);
  if (town && citiesReady && !cityOptions.some((option) => option.value === String(town))) {
    warnings.push("city");
  }
  if (categoriesReady && form.categories.some((category) => {
    const id = typeof category === "number" ? category : "id" in category ? category.id : category.value;
    return !categoryOptions.some((option) => option.value === String(id));
  })) warnings.push("category");
  return warnings;
}
