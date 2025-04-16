import { memo, useCallback, MouseEvent, JSX } from "react";
import { DateOption } from "@utils/constants";
import XIcon from "@heroicons/react/solid/XIcon";
import ChevronDownIcon from "@heroicons/react/solid/ChevronDownIcon";
import AdjustmentsIcon from "@heroicons/react/outline/AdjustmentsIcon";
import { BYDATES } from "@utils/constants";
import { findCategoryKeyByValue } from "@utils/helpers";
import { useRouter } from "next/router";
import useStore from "@store";

interface RenderButtonProps {
  text: string;
  enabled: string | boolean | undefined;
  onClick: () => void;
  handleOpenModal: () => void;
  scrollToTop: () => void;
}

interface FilterState {
  place: string;
  byDate: string;
  category: string;
  distance: string;
  openModal: boolean;
  setState: (
    // eslint-disable-next-line no-unused-vars
    key: "place" | "byDate" | "category" | "distance" | "openModal",
    // eslint-disable-next-line no-unused-vars
    value: string | boolean
  ) => void;
}

interface FiltersProps {
  placeLabel: string;
}

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

const Filters = ({ placeLabel }: FiltersProps): JSX.Element => {
  const router = useRouter();
  const { place, byDate, category, distance, openModal, setState } =
    useStore<FilterState>((state) => ({
      place: state.place,
      byDate: state.byDate,
      category: state.category,
      distance: state.distance,
      openModal: state.openModal,
      setState: state.setState,
    }));

  const isAnyFilterSelected = (): boolean =>
    Boolean(place || byDate || category || distance);
  const getText = (value: string | undefined, defaultValue: string): string =>
    value ? value : defaultValue;
  const foundByDate = BYDATES.find((item) => item.value === byDate);
  const scrollToTop = (): void =>
    window.scrollTo({ top: 0, behavior: "smooth" });

  const handleByDateClick = useCallback((): void => {
    if (byDate) {
      setState("byDate", "");
    } else {
      setState("openModal", true);
    }
  }, [byDate, setState]);

  const handleCategoryClick = useCallback((): void => {
    setState("category", "");
  }, [setState]);

  const handleDistanceClick = useCallback((): void => {
    setState("distance", "");
  }, [setState]);

  const handleOnClick = useCallback(
    (value: string | DateOption | undefined, fn: () => void) => (): void => {
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

      if (place) {
        router.push("/");
      }
    } else {
      setState("openModal", true);
    }
  }, [place, setState, router]);

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
            text: getText(placeLabel, "Població"),
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
