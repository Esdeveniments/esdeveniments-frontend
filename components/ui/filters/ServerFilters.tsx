import { JSX } from "react";
import { getTranslations } from "next-intl/server";
import FiltersClient from "./FiltersClient";
import type { ServerFiltersProps } from "types/props";

const ServerFilters = async ({
  segments,
  queryParams,
  categories = [],
  placeTypeLabel,
  onOpenModal,
}: ServerFiltersProps): Promise<JSX.Element> => {
  const tFilters = await getTranslations("Config.Filters");
  const tFiltersUi = await getTranslations("Components.Filters");
  const tByDates = await getTranslations("Config.ByDates");

  const labels = {
    triggerLabel: tFiltersUi("triggerLabel"),
    displayNameMap: {
      place: tFilters("place"),
      category: tFilters("category"),
      byDate: tFilters("date"),
      distance: tFilters("distance"),
      searchTerm: tFilters("search"),
    },
    byDates: {
      avui: tByDates("today"),
      dema: tByDates("tomorrow"),
      setmana: tByDates("week"),
      "cap-de-setmana": tByDates("weekend"),
    },
  };

  return (
    <FiltersClient
      segments={segments}
      queryParams={queryParams}
      categories={categories}
      placeTypeLabel={placeTypeLabel}
      onOpenModal={onOpenModal}
      labels={labels}
    />
  );
};

export default ServerFilters;
