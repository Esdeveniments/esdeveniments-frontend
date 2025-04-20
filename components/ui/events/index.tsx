import { memo, useEffect, useState, useCallback, FC } from "react";
import NextImage from "next/image";
import dynamic from "next/dynamic";
import useStore from "@store";
import { useScrollVisibility } from "@components/hooks/useScrollVisibility";
import Search from "@components/ui/search";
import SubMenu from "@components/ui/common/subMenu";
import Imago from "public/static/images/imago-esdeveniments.png";
import CardLoading from "@components/ui/cardLoading";
import { makePlaceTypeAndLabel } from "types/common";
import type { EventsProps } from "types/events";

const EventsList = dynamic(() => import("@components/ui/eventsList"), {
  loading: () => (
    <div className="w-full flex-col justify-center items-center sm:w-[580px] md:w-[768px] lg:w-[1024px] mt-32">
      <CardLoading />
    </div>
  ),
  ssr: true,
});

const EventsCategorized = dynamic(
  () => import("@components/ui/eventsCategorized"),
  {
    loading: () => (
      <div className="w-full flex-col justify-center items-center sm:w-[580px] md:w-[768px] lg:w-[1024px] mt-32">
        <CardLoading />
      </div>
    ),
    ssr: true,
  }
);

/* eslint-disable no-unused-vars */
function debounce<F extends (...args: unknown[]) => unknown>(
  func: F,
  wait: number
): (...args: Parameters<F>) => void {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  return function (this: ThisParameterType<F>, ...args: Parameters<F>): void {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}
/* eslint-enable no-unused-vars */

const Events: FC<EventsProps> = ({
  events,
  hasServerFilters,
  placeTypeLabel,
  pageData,
}) => {
  const { setState, areFiltersActive, filtersApplied } = useStore((state) => ({
    openModal: state.openModal,
    setState: state.setState,
    areFiltersActive: state.areFiltersActive,
    filtersApplied: state.filtersApplied,
  }));
  const isSticky = useScrollVisibility(30);
  const isBrowser = typeof window !== "undefined";

  const [scrollIcon, setScrollIcon] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const hasFilters = hasServerFilters || areFiltersActive();

  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  const resetPage = useCallback(() => {
    setState("page", 1);
  }, [setState]);

  useEffect(() => {
    if (isBrowser && filtersApplied) {
      scrollToTop();
      resetPage();
      setState("filtersApplied", false);
    }
  }, [isBrowser, filtersApplied, scrollToTop, resetPage, setState]);

  useEffect(() => {
    if (!isBrowser) {
      return;
    }

    const handleScroll = debounce(() => {
      setScrollIcon(window.scrollY > 400);
    }, 200);

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isBrowser, setState]);

  useEffect(() => {
    setIsLoading(true);
    const loadComponent = async () => {
      if (hasFilters) {
        await import("@components/ui/eventsList");
      } else {
        await import("@components/ui/eventsCategorized");
      }
      setIsLoading(false);
    };
    loadComponent();
  }, [hasFilters]);

  return (
    <>
      <div
        onClick={() =>
          isBrowser && window.scrollTo({ top: 0, behavior: "smooth" })
        }
        className={`w-14 h-14 flex justify-center items-center bg-whiteCorp rounded-md shadow-xl ${
          scrollIcon
            ? "fixed z-10 bottom-28 right-10 flex justify-end animate-appear"
            : "hidden"
        }`}
      >
        <NextImage
          src={Imago}
          className="p-1"
          width={28}
          height={28}
          alt="Esdeveniments.cat"
        />
      </div>
      <div
        className={`w-full bg-whiteCorp fixed transition-all duration-500 ease-in-out ${
          isSticky
            ? "top-10 z-5"
            : "top-0 z-10 md:top-10 border-bColor md:border-b-0 shadow-sm md:shadow-none"
        } flex justify-center items-center pt-2`}
      >
        <div className="w-full flex flex-col justify-center items-center md:items-start mx-auto px-2 pt-2 pb-2 sm:w-[580px] md:w-[768px] lg:w-[1024px]">
          <Search />
          <SubMenu placeLabel={placeTypeLabel?.label || ""} />
        </div>
      </div>
      {isLoading ? (
        <div className="w-full flex-col justify-center items-center sm:w-[580px] md:w-[768px] lg:w-[1024px] mt-32">
          {[...Array(10)].map((_, i) => (
            <CardLoading key={i} />
          ))}
        </div>
      ) : hasFilters ? (
        (() => {
          const safePlaceTypeLabel = placeTypeLabel
            ? makePlaceTypeAndLabel(
                placeTypeLabel.type,
                placeTypeLabel.label,
                placeTypeLabel.regionLabel
              )
            : undefined;
          return (
            <EventsList
              events={events}
              placeTypeLabel={safePlaceTypeLabel}
              pageData={pageData}
            />
          );
        })()
      ) : (
        <EventsCategorized pageData={pageData} />
      )}
    </>
  );
};

export default memo(Events);
