"use client";

import {
  memo,
  useRef,
  useState,
  useCallback,
  useMemo,
  MouseEvent,
  JSX,
  RefObject,
} from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import NextImage from "next/image";
import {
  ClockIcon,
  LocationMarkerIcon,
  CalendarIcon,
  ShareIcon,
} from "@heroicons/react/outline";
import { truncateString, getFormattedDate } from "@utils/helpers";
import useOnScreen from "@components/hooks/useOnScreen";
import Image from "@components/ui/common/image";
import useCheckMobileScreen from "@components/hooks/useCheckMobileScreen";
import ViewCounter from "@components/ui/viewCounter";
import { CardContentProps } from "types/props";

const NativeShareButton = dynamic(
  () => import("@components/ui/common/nativeShareButton"),
  {
    loading: () => <ShareIcon className="h-6 w-6 text-primary" />,
    ssr: false,
  }
);

const ShareButton = dynamic(
  () => import("@components/ui/common/cardShareButton"),
  {
    loading: () => <div />,
    ssr: false,
  }
);

function CardContent({
  event,
  isPriority = false,
  isHorizontal = false,
}: CardContentProps): JSX.Element {
  const counterRef = useRef<HTMLDivElement>(null);
  const shareRef = useRef<HTMLDivElement>(null);
  const isCounterVisible = useOnScreen(counterRef as RefObject<Element>, {
    freezeOnceVisible: true,
  });
  const { prefetch } = useRouter();
  const [isCardLoading, setIsCardLoading] = useState<boolean>(false);
  const isMobile = useCheckMobileScreen();

  const handlePrefetch = useCallback((): void => {
    const href = event.url && event.url.trim() ? event.url : `/e/${event.slug}`;
    prefetch(href);
  }, [event.slug, event.url, prefetch]);

  const handleClick = useCallback((): void => {
    setIsCardLoading(true);
  }, []);

  const handleShareClick = useCallback((e: MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const { description, icon } = event.weather || {};

  const memoizedValues = useMemo(() => {
    const { formattedStart, formattedEnd, nameDay } = getFormattedDate(
      event.startDate,
      event.endDate
    );

    return {
      title: truncateString(event.title || "", isHorizontal ? 30 : 75),
      location: truncateString(event.location || "", 45),
      subLocation: "",
      image: event.imageUrl || "",
      eventDate: formattedEnd
        ? `Del ${formattedStart} al ${formattedEnd}`
        : `${nameDay}, ${formattedStart}`,
    };
  }, [event, isHorizontal]);

  return (
    <>
      <Link
        href={event.url && event.url.trim() ? event.url : `/e/${event.slug}`}
        passHref
        prefetch={false}
        className="w-full"
      >
        <div
          className={`w-full flex flex-col justify-center bg-whiteCorp overflow-hidden cursor-pointer ${
            isCardLoading ? "opacity-50 animate-pulse" : ""
          }`}
          onMouseEnter={handlePrefetch}
          onTouchStart={handlePrefetch}
          onClick={handleClick}
        >
          {/* Title, Share Button, and Weather Icon */}
          <div className="bg-whiteCorp h-fit flex justify-start items-start gap-2 pr-4">
            <div className="flex justify-start items-center gap-0 pt-[2px] m-0">
              <div className="w-2 h-6 bg-gradient-to-r from-primary to-primarydark"></div>
            </div>
            <h3 className="w-full uppercase">{memoizedValues.title}</h3>
            <div className="flex items-end gap-2">
              {icon && (
                <div className="flex items-center gap-1">
                  <NextImage
                    alt={description || "Weather icon"}
                    src={icon}
                    width="30"
                    height="30"
                    style={{
                      maxWidth: "100%",
                      height: "auto",
                    }}
                    priority={isPriority}
                  />
                </div>
              )}
              {isMobile && (
                <NativeShareButton
                  title={event.title}
                  url={
                    event.url && event.url.trim()
                      ? event.url
                      : `/e/${event.slug}`
                  }
                  date={memoizedValues.eventDate}
                  location={memoizedValues.location}
                  subLocation={memoizedValues.subLocation}
                  onShareClick={handleShareClick}
                  hideText={true}
                />
              )}
            </div>
          </div>
          {/* ImageEvent */}
          <div className="p-2 flex justify-center items-center" ref={shareRef}>
            <div
              className="w-full relative"
              style={{ height: isHorizontal ? "16rem" : "auto" }}
            >
              <Image
                className={`w-full flex justify-center ${
                  isHorizontal ? "h-64 object-cover" : "object-contain"
                }`}
                title={event.title}
                image={memoizedValues.image}
                priority={isPriority}
                alt={event.title}
                context={isHorizontal ? "list" : "card"}
              />
            </div>
          </div>
        </div>
      </Link>
      {/* Share and ViewCounter */}
      <div
        className="w-full flex justify-center items-center gap-2 px-2 mb-2"
        ref={counterRef}
      >
        {!isMobile && <ShareButton slug={event.slug} />}
        {isPriority ? (
          <ViewCounter visits={event.visits} hideText />
        ) : (
          isCounterVisible && <ViewCounter visits={event.visits} hideText />
        )}
      </div>
      <div className="w-full flex flex-col px-4 gap-3">
        <div className="flex justify-start items-start">
          <CalendarIcon className="h-5 w-5" />
          <p className="px-2 font-semibold">{memoizedValues.eventDate}</p>
        </div>
        {/* Location */}
        <div className="flex justify-start items-start">
          <LocationMarkerIcon className="h-5 w-5" />
          <div className="h-full flex flex-col justify-start items-start px-2">
            <span className="max-w-full capitalize">
              {memoizedValues.location}
            </span>
          </div>
        </div>
        {/* Date time */}
        <div className="flex justify-start items-center">
          <ClockIcon className="h-5 w-5" />
          <p className="px-2">
            {event.startTime && event.endTime
              ? `${event.startTime} - ${event.endTime}`
              : "Consultar horaris"}
          </p>
        </div>
        {!isHorizontal && <div className="mb-8" />}
      </div>
    </>
  );
}

export default memo(CardContent);
