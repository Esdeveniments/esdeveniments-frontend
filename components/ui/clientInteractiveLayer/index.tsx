"use client";

import { memo, useEffect, useState, Suspense } from "react";
import NextImage from "next/image";
import { useScrollVisibility } from "@components/hooks/useScrollVisibility";
import { useHydration } from "@components/hooks/useHydration";
import Search from "@components/ui/search";
import SubMenu from "@components/ui/common/subMenu";
import Imago from "public/static/images/imago-esdeveniments.png";

// Removed EventsList - now using pure server-side filtering

function debounce<F extends (...args: unknown[]) => unknown>(
  func: F,
  wait: number
): (...args: Parameters<F>) => void {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (this: ThisParameterType<F>, ...args: Parameters<F>): void {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function ClientInteractiveLayer() {
  const isSticky = useScrollVisibility(30);
  const isHydrated = useHydration();
  const [scrollIcon, setScrollIcon] = useState(false);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const handleScroll = debounce(() => {
      setScrollIcon(window.scrollY > 400);
    }, 200);

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHydrated]);

  // Prevent hydration mismatch by using consistent initial state
  const stickyClasses =
    isHydrated && isSticky
      ? "top-10 z-5"
      : "top-0 z-10 md:top-10 border-bColor md:border-b-0 shadow-sm md:shadow-none";

  return (
    <>
      {/* Floating Scroll Button */}
      <div
        onClick={() =>
          isHydrated && window.scrollTo({ top: 0, behavior: "smooth" })
        }
        className={`w-14 h-14 flex justify-center items-center bg-whiteCorp rounded-md shadow-xl cursor-pointer ${
          isHydrated && scrollIcon
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

      {/* Fixed Search and Filters Bar */}
      <div
        className={`w-full bg-whiteCorp fixed transition-all duration-500 ease-in-out ${stickyClasses} flex justify-center items-center pt-2`}
      >
        <div className="w-full flex flex-col justify-center items-center md:items-start mx-auto px-2 pt-2 pb-2 sm:w-[580px] md:w-[768px] lg:w-[1024px]">
          <Suspense fallback={<div className="w-full h-12 bg-whiteCorp animate-pulse rounded-full" />}>
            <Search />
          </Suspense>
          <SubMenu />
        </div>
      </div>

      {/* No client-side events rendering - all handled server-side now */}
    </>
  );
}

export default memo(ClientInteractiveLayer);
