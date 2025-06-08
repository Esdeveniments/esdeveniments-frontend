"use client";

import { memo, useCallback, MouseEvent, JSX } from "react";
import XIcon from "@heroicons/react/solid/XIcon";
import ChevronDownIcon from "@heroicons/react/solid/ChevronDownIcon";
import AdjustmentsIcon from "@heroicons/react/outline/AdjustmentsIcon";
import { BYDATES } from "@utils/constants";
import { findCategoryKeyByValue } from "@utils/helpers";
import { useRouter, useSearchParams } from "next/navigation";
import useStore from "@store";
import type { Option } from "types/common";
import { RenderButtonProps } from "types/common";
import { FilterState } from "types/filters";

const renderButton = ({
  text,
  enabled,
  onClick,
  handleOpenModal,
  scrollToTop,
}: RenderButtonProps): JSX.Element => (
  <div
    key={text}
    className="w-full bg-whiteCorp flex justify-center items-center nowrap"
  >
    <div
      className={`w-full flex justify-center items-center gap-1 px-1 ease-in-out duration-300 focus:outline-none font-medium ${
        enabled
          ? "text-primary"
          : "border-whiteCorp text-blackCorp hover:bg-darkCorp hover:text-blackCorp"
      }`}
    >
      <span
        onClick={handleOpenModal}
        className="w-full text-center font-barlow uppercase text-[16px]"
      >
        {text}
      </span>
      {enabled ? (
        <XIcon
          className="h-5 w-5"
          aria-hidden="true"
          onClick={(e: MouseEvent) => {
            e.stopPropagation();
            onClick();
            scrollToTop();
          }}
        />
      ) : (
        <ChevronDownIcon
          className="h-5 w-5"
          aria-hidden="true"
          onClick={(e: MouseEvent) => {
            e.stopPropagation();
            onClick();
          }}
        />
      )}
    </div>
  </div>
);

const Filters = (): JSX.Element => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read filter values from URL parameters (primary source) with store as fallback
  const urlCategory = searchParams.get("category");
  const urlDate = searchParams.get("date");
  const urlDistance = searchParams.get("distance");
  const urlSearch = searchParams.get("search");

  const {
    place,
    byDate: storeByDate,
    category: storeCategory,
    searchTerm: storeSearchTerm,
    distance: storeDistance,
    openModal,
    setState,
  } = useStore<FilterState>((state) => ({
    place: state.place,
    byDate: state.byDate,
    category: state.category,
    searchTerm: state.searchTerm,
    distance: state.distance,
    openModal: state.openModal,
    setState: state.setState,
  }));

  // Use URL parameters as the primary source of truth for filter values
  const byDate = urlDate || storeByDate;
  const category = urlCategory || storeCategory;
  const searchTerm = urlSearch || storeSearchTerm;
  const distance = urlDistance || storeDistance;

  const isAnyFilterSelected = (): boolean =>
    Boolean(place || byDate || category || searchTerm || distance);
  const getText = (value: string | undefined, defaultValue: string): string =>
    value ? value : defaultValue;
  const foundByDate = BYDATES.find((item) => item.value === byDate);
  const scrollToTop = (): void =>
    window.scrollTo({ top: 0, behavior: "smooth" });

  const handleByDateClick = useCallback((): void => {
    if (byDate) {
      setState("byDate", "");

      // Update URL to remove date parameter
      const params = new URLSearchParams(searchParams.toString());
      params.delete("date");

      const newUrl = place
        ? `/${place}${params.toString() ? `?${params.toString()}` : ""}`
        : `/${params.toString() ? `?${params.toString()}` : ""}`;

      router.push(newUrl);
    } else {
      setState("openModal", true);
    }
  }, [byDate, place, searchParams, setState, router]);

  const handleCategoryClick = useCallback((): void => {
    if (category) {
      setState("category", "");

      // Update URL to remove category parameter
      const params = new URLSearchParams(searchParams.toString());
      params.delete("category");

      const newUrl = place
        ? `/${place}${params.toString() ? `?${params.toString()}` : ""}`
        : `/${params.toString() ? `?${params.toString()}` : ""}`;

      router.push(newUrl);
    } else {
      setState("openModal", true);
    }
  }, [category, place, searchParams, setState, router]);

  const handleDistanceClick = useCallback((): void => {
    if (distance) {
      setState("distance", "");

      // Update URL to remove distance parameter
      const params = new URLSearchParams(searchParams.toString());
      params.delete("distance");

      const newUrl = place
        ? `/${place}${params.toString() ? `?${params.toString()}` : ""}`
        : `/${params.toString() ? `?${params.toString()}` : ""}`;

      router.push(newUrl);
    } else {
      setState("openModal", true);
    }
  }, [distance, place, searchParams, setState, router]);

  const handleSearchClick = useCallback((): void => {
    if (searchTerm) {
      setState("searchTerm", "");

      // Update URL to remove search parameter
      const params = new URLSearchParams(searchParams.toString());
      params.delete("search");

      const newUrl = place
        ? `/${place}${params.toString() ? `?${params.toString()}` : ""}`
        : `/${params.toString() ? `?${params.toString()}` : ""}`;

      router.push(newUrl);
    }
  }, [searchTerm, place, searchParams, setState, router]);

  const handleOnClick = useCallback(
    (value: string | Option | undefined, fn: () => void) => (): void => {
      if (value) {
        fn();
      } else {
        setState("openModal", true);
      }
    },
    [setState]
  );

  const handlePlaceClick = useCallback((): void => {
    if (place) {
      setState("place", "");

      // Check if any other filters are active
      const hasOtherFilters = Boolean(byDate || category || searchTerm || distance);

      if (hasOtherFilters) {
        // Build query parameters for non-place filters
        const params = new URLSearchParams();
        if (byDate) params.set("date", byDate);
        if (category) params.set("category", category);
        if (searchTerm) params.set("search", searchTerm);
        if (distance) params.set("distance", distance);

        const queryString = params.toString();
        const url = `/${queryString ? `?${queryString}` : ""}`;
        router.push(url);
      } else {
        // No other filters active, navigate to homepage
        router.push("/");
      }
    } else {
      setState("openModal", true);
    }
  }, [place, byDate, category, searchTerm, distance, setState, router]);

  return (
    <div
      className={`w-full bg-whiteCorp flex justify-center items-center mt-2 ${
        openModal ? "opacity-50 animate-pulse pointer-events-none" : ""
      }`}
    >
      <div className="w-full h-10 flex justify-start items-center cursor-pointer">
        <div
          onClick={() => setState("openModal", true)}
          className="mr-3 flex justify-center items-center gap-3 cursor-pointer"
        >
          <AdjustmentsIcon
            className={
              isAnyFilterSelected()
                ? "w-5 h-5 text-primary"
                : "w-5 h-5 text-blackCorp"
            }
            aria-hidden="true"
          />
          <p className="hidden md:block uppercase italic font-semibold font-barlow text-[16px]">
            Filtres
          </p>
        </div>
        <div className="w-8/10 flex items-center gap-1 border-0 placeholder:text-bColor overflow-x-auto">
          {renderButton({
            text: getText(place, "Població"),
            enabled: Boolean(place),
            onClick: handlePlaceClick,
            handleOpenModal: () => setState("openModal", true),
            scrollToTop,
          })}
          {renderButton({
            text: getText(
              category ? findCategoryKeyByValue(category) : category,
              "Categoria"
            ),
            enabled: Boolean(category),
            onClick: handleOnClick(category, handleCategoryClick),
            handleOpenModal: () => setState("openModal", true),
            scrollToTop,
          })}
          {renderButton({
            text: getText(searchTerm, "Cerca"),
            enabled: Boolean(searchTerm),
            onClick: handleSearchClick,
            handleOpenModal: () => setState("openModal", true),
            scrollToTop,
          })}
          {renderButton({
            text: getText(foundByDate?.label, "Data"),
            enabled: Boolean(foundByDate),
            onClick: handleOnClick(foundByDate, handleByDateClick),
            handleOpenModal: () => setState("openModal", true),
            scrollToTop,
          })}
          {renderButton({
            text: getText(distance ? `${distance} km` : undefined, "Distància"),
            enabled: Boolean(distance),
            onClick: handleOnClick(distance, handleDistanceClick),
            handleOpenModal: () => setState("openModal", true),
            scrollToTop,
          })}
        </div>
      </div>
    </div>
  );
};

export default memo(Filters);
