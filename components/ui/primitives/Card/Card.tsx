"use client";

import { useEffect } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@components/utils/cn";
import Link from "next/link";
import NextImage from "next/image";
import Image from "next/image";
import {
  ClockIcon,
  LocationMarkerIcon,
  CalendarIcon,
} from "@heroicons/react/outline";
import { truncateString, getFormattedDate } from "@utils/helpers";
import { ImageServer, ViewCounter, Text } from "@components/ui/primitives";
import DOMPurify from "isomorphic-dompurify";
import { Skeleton } from "@components/ui/primitives";
import { EventSummaryResponseDTO } from "types/api/event";
import { NewsSummaryResponseDTO, NewsEventItemDTO } from "types/api/news";
import AdCardClient from "@components/ui/adCard";
import { trackComponentUsage } from "@utils/analytics";
import { useComponentPerformance } from "@components/hooks/useComponentPerformance";

export const cardVariants = cva(
  "rounded-lg border bg-whiteCorp text-blackCorp shadow-sm",
  {
    variants: {
      variant: {
        elevated: "shadow-md",
        outlined: "border-bColor",
        filled: "border-transparent bg-darkCorp/5",
      },
      padding: {
        none: "p-xs",
        sm: "p-component-sm",
        md: "p-component-md",
        lg: "p-component-lg",
      },
    },
    defaultVariants: {
      variant: "elevated",
      padding: "md",
    },
  },
);

type CardType =
  | "basic"
  | "event"
  | "event-vertical"
  | "event-horizontal"
  | "news"
  | "news-default"
  | "news-hero"
  | "news-rich"
  | "ad"
  | "compact"
  | "loading";

interface BaseCardProps {
  type?: CardType;
  className?: string;
}

interface BasicCardProps
  extends BaseCardProps,
    VariantProps<typeof cardVariants> {
  type?: "basic";
  children: React.ReactNode;
}

interface EventCardProps extends BaseCardProps {
  type: "event" | "event-vertical" | "event-horizontal" | "compact";
  variant?: "vertical" | "horizontal" | "compact";
  event: EventSummaryResponseDTO;
  isPriority?: boolean;
  isHorizontal?: boolean;
}

interface NewsCardProps extends BaseCardProps {
  type: "news" | "news-default" | "news-hero" | "news-rich";
  variant?: "default" | "hero" | "rich" | "horizontal";
  event: NewsSummaryResponseDTO | NewsEventItemDTO;
  placeSlug?: string;
  placeLabel?: string;
  numbered?: number;
}

interface AdCardProps extends BaseCardProps {
  type: "ad";
  variant?: "default";
}

interface LoadingCardProps extends BaseCardProps {
  type: "loading";
  variant?: "default";
}

type CardProps =
  | BasicCardProps
  | EventCardProps
  | NewsCardProps
  | AdCardProps
  | LoadingCardProps;

/**
 * Unified Card component that supports various types and variants.
 *
 * @example
 * // New unified API
 * <Card type="event" variant="vertical" event={eventData} />
 * <Card type="news" variant="hero" event={newsData} placeSlug="catalunya" />
 *
 * // Backward compatible API
 * <Card type="event-vertical" event={eventData} />
 * <Card type="news-hero" event={newsData} placeSlug="catalunya" />
 *
 * @param props - Card properties
 * @returns JSX.Element
 */
export const Card = (props: CardProps) => {
  const { type = "basic", className, ...rest } = props;

  // Normalize type and variant for unified API
  const normalizeTypeAndVariant = (
    type: CardType | undefined,
    variant: string | undefined,
  ) => {
    if (!type) return { normalizedType: "basic", normalizedVariant: "default" };

    if (type.includes("-")) {
      const [t, v] = type.split("-");
      return { normalizedType: t, normalizedVariant: v };
    }

    return { normalizedType: type, normalizedVariant: variant || "default" };
  };

  const { normalizedType, normalizedVariant } = normalizeTypeAndVariant(
    type,
    (rest as any).variant,
  );

  useComponentPerformance("Card");
  useEffect(() => {
    trackComponentUsage("Card", type);
  }, [type]);

  if (normalizedType === "basic") {
    const { variant, padding, children } = rest as BasicCardProps;
    return (
      <div
        className={cn(cardVariants({ variant, padding }), className)}
        {...(rest as any)}
      >
        {children}
      </div>
    );
  }

  if (normalizedType === "event" && normalizedVariant === "vertical") {
    const {
      event,
      isPriority = false,
      isHorizontal = false,
    } = rest as EventCardProps;
    const { description, icon } = event.weather || {};
    const { formattedStart, formattedEnd, nameDay } = getFormattedDate(
      event.startDate,
      event.endDate,
    );
    const title = truncateString(event.title || "", isHorizontal ? 30 : 75);
    const location = truncateString(event.location || "", 45);
    const image = event.imageUrl || "";
    const eventDate = formattedEnd
      ? `Del ${formattedStart} al ${formattedEnd}`
      : `${nameDay}, ${formattedStart}`;

    return (
      <>
        <Link
          href={`/e/${event.slug}`}
          passHref
          prefetch={false}
          className="w-full"
        >
          <div className="flex w-full cursor-pointer flex-col justify-center overflow-hidden bg-whiteCorp">
            <div className="flex h-fit items-start justify-start gap-component-xs bg-whiteCorp pr-component-md">
              <div className="m-xs flex items-center justify-start gap-xs pt-component-xs">
                <div className="h-6 w-2 bg-gradient-to-r from-primary to-primarydark"></div>
              </div>
              <Text as="h3" className="w-full uppercase">
                {title}
              </Text>
              <div className="flex items-end gap-component-xs">
                {icon && (
                  <div className="flex items-center gap-xs">
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
              </div>
            </div>
            <div className="flex items-center justify-center p-component-xs">
              <div
                className="relative w-full"
                style={{ height: isHorizontal ? "16rem" : "auto" }}
              >
                <ImageServer
                  className={`flex w-full justify-center ${
                    isHorizontal ? "h-64 object-cover" : "object-contain"
                  }`}
                  title={event.title}
                  image={image}
                  priority={isPriority}
                  alt={event.title}
                  location={event.city?.name || event.location}
                  region={event.region?.name || event.city?.name}
                  date={eventDate}
                />
              </div>
            </div>
          </div>
        </Link>
        <div className="flex w-full flex-col gap-component-sm px-component-md">
          <div className="flex items-start justify-start">
            <CalendarIcon className="h-5 w-5" />
            <Text as="p" className="px-component-xs font-semibold">
              {eventDate}
            </Text>
          </div>
          <div className="flex items-start justify-start">
            <LocationMarkerIcon className="h-5 w-5" />
            <div className="flex h-full flex-col items-start justify-start px-component-xs">
              <Text as="span" className="max-w-full">
                {location}
              </Text>
            </div>
          </div>
          <div className="flex items-center justify-start">
            <ClockIcon className="h-5 w-5" />
            <Text as="p" className="px-component-xs">
              {event.startTime && event.endTime
                ? `${event.startTime} - ${event.endTime}`
                : "Consultar horaris"}
            </Text>
          </div>
          {!isHorizontal && <div className="mb-component-xl" />}
        </div>
      </>
    );
  }

  if (normalizedType === "event" && normalizedVariant === "horizontal") {
    const { event, isPriority = false } = rest as EventCardProps;
    const title = truncateString(event.title || "", 60);
    const { formattedStart, formattedEnd, nameDay } = getFormattedDate(
      event.startDate,
      event.endDate,
    );
    const eventDate = formattedEnd
      ? `Del ${formattedStart} al ${formattedEnd}`
      : `${nameDay}, ${formattedStart}`;

    return (
      <Link href={`/e/${event.slug}`} className="group relative block h-full">
        <article className="relative z-10 flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-lg bg-whiteCorp shadow-sm transition-shadow duration-200 group-hover:shadow-md">
          <div className="h-48 w-full overflow-hidden">
            <ImageServer
              className="h-full w-full"
              title={event.title}
              alt={event.title}
              image={event.imageUrl}
              priority={isPriority}
              location={event.city?.name}
              region={event.region?.name}
              date={eventDate}
              context="list"
            />
          </div>
          <div className="flex flex-1 flex-col justify-between p-component-md">
            <div>
              <div className="mb-component-sm flex items-start justify-between gap-component-sm">
                <div className="flex min-w-0 flex-1 items-center gap-component-xs">
                  <div className="h-6 w-1 flex-shrink-0 bg-gradient-to-b from-primary to-primarydark"></div>
                  <Text
                    as="h3"
                    variant="body-lg"
                    className="line-clamp-2 flex-1 font-semibold text-blackCorp transition-all duration-200 group-hover:underline"
                  >
                    {title}
                  </Text>
                </div>
                <div className="flex-shrink-0">
                  <ViewCounter visits={event.visits} hideText />
                </div>
              </div>
            </div>
            <div>
              <div className="mb-component-xs flex items-center">
                <svg
                  className="mr-component-xs h-4 w-4 flex-shrink-0 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <Text as="span" variant="body-sm">
                  {eventDate}
                </Text>
              </div>
              <div className="flex items-center">
                <svg
                  className="mr-component-xs h-4 w-4 flex-shrink-0 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <Text as="span" variant="body-sm" className="truncate">
                  {event.location}
                </Text>
              </div>
            </div>
          </div>
        </article>
      </Link>
    );
  }

  if (normalizedType === "news" && normalizedVariant === "default") {
    const {
      event,
      placeSlug,
      placeLabel,
      variant = "default",
    } = rest as NewsCardProps;
    const image = event.imageUrl;
    const formatted = getFormattedDate(event.startDate, event.endDate);
    const dateLabel = formatted.formattedEnd
      ? `${formatted.formattedStart} – ${formatted.formattedEnd}`
      : formatted.formattedStart;
    const href = `/noticies/${placeSlug}/${event.slug}`;
    const plainDescription = DOMPurify.sanitize(event.description || "", {
      ALLOWED_TAGS: [],
    });

    if (variant === "hero") {
      return (
        <section className="relative w-full overflow-hidden rounded-xl bg-darkCorp shadow-lg">
          {image ? (
            <div className="relative aspect-[16/9] w-full md:h-80">
              <Image
                src={image || "/placeholder.svg"}
                alt={event.title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 1024px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="aspect-[16/9] w-full bg-gradient-to-br from-primarySoft to-primary md:h-80" />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-fullBlackCorp/95 via-fullBlackCorp/70 to-fullBlackCorp/40" />
          <div className="absolute inset-x-0 bottom-0 px-component-md pb-component-xl pt-component-lg text-whiteCorp sm:p-component-lg">
            <Text
              as="h2"
              variant="h1"
              className="mb-component-sm text-balance font-extrabold leading-tight md:drop-shadow-2xl"
            >
              {event.title}
            </Text>
            <div className="flex flex-col gap-component-md sm:flex-row sm:items-center sm:justify-between">
              <div className="flex max-w-full flex-col gap-xs">
                <Text
                  as="span"
                  variant="body"
                  className="inline-flex items-center font-medium md:drop-shadow-lg"
                >
                  📅 {dateLabel}
                </Text>
                {placeLabel && (
                  <Text
                    as="span"
                    variant="body"
                    className="inline-flex items-center font-medium md:drop-shadow-lg"
                  >
                    📍 {placeLabel}
                  </Text>
                )}
              </div>
              <Link
                href={href}
                prefetch={false}
                className="inline-flex items-center self-start rounded-lg bg-primary px-component-md py-component-xs font-semibold text-whiteCorp shadow-md transition-colors hover:bg-primarydark sm:self-auto sm:shadow-xl sm:hover:shadow-2xl md:px-component-lg md:py-component-sm"
              >
                <Text variant="body">Llegir més</Text>
              </Link>
            </div>
          </div>
        </section>
      );
    }

    return (
      <article className="group w-full overflow-hidden rounded-xl border border-bColor bg-whiteCorp shadow-sm transition-all hover:border-blackCorp/20 hover:shadow-lg">
        <div className="relative overflow-hidden">
          {image ? (
            <Image
              src={image || "/placeholder.svg"}
              alt={event.title}
              width={1200}
              height={675}
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 80vw, 800px"
              className="aspect-[16/9] w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="aspect-[16/9] w-full bg-gradient-to-br from-darkCorp to-bColor" />
          )}
        </div>
        <div className="p-component-lg">
          <div className="mb-component-md flex flex-wrap items-center gap-component-xs">
            {placeLabel && (
              <Text
                as="span"
                variant="caption"
                className="inline-flex items-center rounded-full bg-darkCorp px-component-sm py-component-xs font-medium text-blackCorp"
              >
                📍 {placeLabel}
              </Text>
            )}
            <Text
              as="span"
              variant="caption"
              className="inline-flex items-center rounded-full bg-darkCorp px-component-sm py-component-xs font-medium text-blackCorp"
            >
              📅 {dateLabel}
            </Text>
          </div>
          <Text
            as="h3"
            variant="h3"
            className="mb-component-md font-bold leading-tight text-blackCorp transition-colors group-hover:text-primary"
          >
            <Link
              href={href}
              prefetch={false}
              className="rounded-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label={event.title}
            >
              {event.title}
            </Link>
          </Text>
          {plainDescription && (
            <Text
              as="p"
              variant="body-sm"
              className="mb-component-md line-clamp-3 leading-relaxed text-blackCorp/70"
            >
              {plainDescription}
            </Text>
          )}
          <div className="flex items-center justify-between">
            <Link
              href={href}
              prefetch={false}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-component-md py-component-xs font-semibold text-whiteCorp transition-all hover:bg-primarydark hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label={`Llegir-ne més de ${event.title}`}
            >
              <Text variant="body-sm">Llegir més</Text>
            </Link>
          </div>
        </div>
      </article>
    );
  }

  if (normalizedType === "news" && normalizedVariant === "hero") {
    const { event, placeSlug, placeLabel } = rest as NewsCardProps;
    const image = event.imageUrl;
    const formatted = getFormattedDate(event.startDate, event.endDate);
    const dateLabel = formatted.formattedEnd
      ? `${formatted.formattedStart} – ${formatted.formattedEnd}`
      : formatted.formattedStart;
    const href = `/noticies/${placeSlug}/${event.slug}`;

    return (
      <section className="relative w-full overflow-hidden rounded-xl bg-darkCorp shadow-lg">
        {image ? (
          <div className="relative aspect-[16/9] w-full md:h-80">
            <Image
              src={image || "/placeholder.svg"}
              alt={event.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 1024px"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="aspect-[16/9] w-full bg-gradient-to-br from-primarySoft to-primary md:h-80" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-fullBlackCorp/95 via-fullBlackCorp/70 to-fullBlackCorp/40" />
        <div className="absolute inset-x-0 bottom-0 px-component-md pb-component-xl pt-component-lg text-whiteCorp sm:p-component-lg">
          <Text
            as="h2"
            variant="h1"
            className="mb-component-sm text-balance font-extrabold leading-tight md:drop-shadow-2xl"
          >
            {event.title}
          </Text>
          <div className="flex flex-col gap-component-md sm:flex-row sm:items-center sm:justify-between">
            <div className="flex max-w-full flex-col gap-xs">
              <Text
                as="span"
                variant="body"
                className="inline-flex items-center font-medium md:drop-shadow-lg"
              >
                📅 {dateLabel}
              </Text>
              {placeLabel && (
                <Text
                  as="span"
                  variant="body"
                  className="inline-flex items-center font-medium md:drop-shadow-lg"
                >
                  📍 {placeLabel}
                </Text>
              )}
            </div>
            <Link
              href={href}
              prefetch={false}
              className="inline-flex items-center self-start rounded-lg bg-primary px-component-md py-component-xs font-semibold text-whiteCorp shadow-md transition-colors hover:bg-primarydark sm:self-auto sm:shadow-xl sm:hover:shadow-2xl md:px-component-lg md:py-component-sm"
            >
              Llegir més
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (normalizedType === "news" && normalizedVariant === "rich") {
    const { event, variant = "default", numbered } = rest as NewsCardProps;
    const image = event.imageUrl;
    const formatted = getFormattedDate(event.startDate, event.endDate);
    const dateLabel = formatted.formattedEnd
      ? `${formatted.formattedStart} – ${formatted.formattedEnd}`
      : formatted.formattedStart;
    const primaryCategory =
      (event as NewsEventItemDTO).categories &&
      (event as NewsEventItemDTO).categories.length > 0
        ? {
            name: (event as NewsEventItemDTO).categories[0].name,
            slug: (event as NewsEventItemDTO).categories[0].slug,
          }
        : undefined;
    const plainDescription = DOMPurify.sanitize(event.description || "", {
      ALLOWED_TAGS: [],
    });

    if (variant === "horizontal") {
      return (
        <article className="group w-full overflow-hidden rounded-xl border border-bColor bg-whiteCorp shadow-sm transition-all hover:border-blackCorp/20 hover:shadow-lg">
          <div className="relative z-[1] flex flex-col gap-component-lg p-component-lg md:flex-row">
            {numbered && (
              <div className="flex-shrink-0">
                <Text
                  as="div"
                  variant="h3"
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-primary font-bold text-whiteCorp"
                >
                  {numbered}
                </Text>
              </div>
            )}
            <div className="md:flex-shrink-0">
              {image ? (
                <Image
                  src={image || "/placeholder.svg"}
                  alt={event.title}
                  width={200}
                  height={150}
                  className="aspect-[4/3] w-full rounded-lg object-cover transition-transform group-hover:scale-105 md:w-48"
                />
              ) : (
                <div className="aspect-[4/3] w-full rounded-lg bg-gradient-to-br from-darkCorp to-bColor md:w-48" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-component-sm flex flex-wrap items-center gap-component-xs">
                {primaryCategory && (
                  <Link
                    href={`/catalunya/${primaryCategory.slug}`}
                    prefetch={false}
                    className="inline-flex items-center rounded-full bg-primary px-component-sm py-component-xs font-semibold text-whiteCorp transition-colors hover:bg-primarydark"
                    aria-label={`Veure categoria ${primaryCategory.name}`}
                  >
                    {primaryCategory.name}
                  </Link>
                )}
                {(event as NewsEventItemDTO).location && (
                  <Text
                    as="span"
                    variant="caption"
                    className="inline-flex items-center rounded-full bg-darkCorp px-component-sm py-component-xs font-medium text-blackCorp"
                  >
                    📍 {(event as NewsEventItemDTO).location}
                  </Text>
                )}
                <Text
                  as="span"
                  variant="caption"
                  className="inline-flex items-center rounded-full bg-darkCorp px-component-sm py-component-xs font-medium text-blackCorp"
                >
                  📅 {dateLabel}
                </Text>
              </div>
              <Text
                as="h3"
                variant="h2"
                className="mb-component-sm font-bold leading-tight text-blackCorp transition-colors group-hover:text-primary"
              >
                <Link
                  href={`/e/${event.slug}`}
                  prefetch={false}
                  className="rounded-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  aria-label={event.title}
                >
                  {event.title}
                </Link>
              </Text>
              {plainDescription && (
                <Text
                  as="p"
                  variant="body"
                  className="mb-component-md line-clamp-3 leading-relaxed text-blackCorp/70"
                >
                  {plainDescription}
                </Text>
              )}
              <div className="flex items-center justify-between">
                <Link
                  href={`/e/${event.slug}`}
                  prefetch={false}
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-component-md py-component-xs font-semibold text-whiteCorp transition-all hover:bg-primarydark hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  aria-label={`Llegir-ne més de ${event.title}`}
                >
                  Llegir més
                </Link>
              </div>
            </div>
          </div>
        </article>
      );
    }

    return (
      <article className="group w-full overflow-hidden rounded-xl border border-bColor bg-whiteCorp shadow-sm transition-all hover:border-blackCorp/20 hover:shadow-lg">
        <div className="relative overflow-hidden">
          {image ? (
            <Image
              src={image || "/placeholder.svg"}
              alt={event.title}
              width={1200}
              height={675}
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 80vw, 800px"
              className="aspect-[16/9] w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="aspect-[16/9] w-full bg-gradient-to-br from-darkCorp to-bColor" />
          )}
        </div>
        <div className="p-component-lg">
          <div className="mb-component-md flex flex-wrap items-center gap-component-xs">
            {primaryCategory && (
              <Link
                href={`/catalunya/${primaryCategory.slug}`}
                prefetch={false}
                className="inline-flex items-center rounded-full bg-primary px-component-sm py-component-xs font-semibold text-whiteCorp transition-colors hover:bg-primarydark"
                aria-label={`Veure categoria ${primaryCategory.name}`}
              >
                {primaryCategory.name}
              </Link>
            )}
            {(event as NewsEventItemDTO).location && (
              <Text
                as="span"
                variant="caption"
                className="inline-flex items-center rounded-full bg-darkCorp px-component-sm py-component-xs font-medium text-blackCorp"
              >
                📍 {(event as NewsEventItemDTO).location}
              </Text>
            )}
            <Text
              as="span"
              variant="caption"
              className="inline-flex items-center rounded-full bg-darkCorp px-component-sm py-component-xs font-medium text-blackCorp"
            >
              📅 {dateLabel}
            </Text>
          </div>
          <Text
            as="h3"
            variant="h3"
            className="mb-component-md font-bold leading-tight text-blackCorp transition-colors group-hover:text-primary"
          >
            <Link
              href={`/e/${event.slug}`}
              prefetch={false}
              className="rounded-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label={event.title}
            >
              {event.title}
            </Link>
          </Text>
          {plainDescription && (
            <Text
              as="p"
              variant="body-sm"
              className="mb-component-md line-clamp-3 leading-relaxed text-blackCorp/70"
            >
              {plainDescription}
            </Text>
          )}
          <div className="flex items-center justify-between">
            <Link
              href={`/e/${event.slug}`}
              prefetch={false}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-component-md py-component-xs font-semibold text-whiteCorp transition-all hover:bg-primarydark hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label={`Llegir-ne més de ${event.title}`}
            >
              Llegir més
            </Link>
          </div>
        </div>
      </article>
    );
  }

  if (normalizedType === "ad") {
    return <AdCardClient />;
  }

  if (normalizedType === "event" && normalizedVariant === "compact") {
    const { event } = rest as EventCardProps;
    const eventTitle = truncateString(event.title || "", 60);
    const image = event.imageUrl;
    const { formattedStart, formattedEnd, nameDay } = getFormattedDate(
      event.startDate,
      event.endDate,
    );
    const eventDate = formattedEnd
      ? `Del ${formattedStart} al ${formattedEnd}`
      : `${nameDay}, ${formattedStart}`;

    return (
      <Link href={`/e/${event.slug}`}>
        <div className="mb-component-2xl flex w-40 min-w-[10rem] flex-none cursor-pointer flex-col overflow-hidden bg-whiteCorp">
          <div className="flex h-32 w-full items-center justify-center overflow-hidden">
            <ImageServer
              className="w-full object-cover"
              title={event.title}
              alt={event.title}
              image={image}
              priority={false}
              context="card"
            />
          </div>
          <div className="flex pt-component-xs">
            <div className="pr-component-xs pt-component-xs">
              <div className="h-4 w-2 bg-gradient-to-r from-primary to-primarydark"></div>
            </div>
            <Text
              as="h3"
              variant="body-sm"
              className="overflow-hidden text-ellipsis whitespace-nowrap font-semibold"
            >
              {eventTitle}
            </Text>
          </div>
          <div className="pt-component-xs">
            <Text
              as="div"
              variant="caption"
              className="overflow-hidden text-ellipsis whitespace-nowrap font-normal"
            >
              <Text as="span">{event.location || ""}</Text>
            </Text>
          </div>
          <div className="pt-component-xs">
            <Text
              as="div"
              variant="caption"
              className="overflow-hidden text-ellipsis whitespace-nowrap font-normal text-blackCorp/80"
            >
              <Text as="span">{eventDate}</Text>
            </Text>
          </div>
        </div>
      </Link>
    );
  }

  if (normalizedType === "loading") {
    return <Skeleton variant="card" />;
  }

  return null;
};

// Compound components
Card.Header = ({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}) => (
  <div
    className={cn("border-b border-bColor/50 p-component-md", className)}
    {...props}
  >
    {children}
  </div>
);

Card.Body = ({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}) => (
  <div className={cn("p-component-md", className)} {...props}>
    {children}
  </div>
);

Card.Footer = ({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}) => (
  <div
    className={cn("border-t border-bColor/50 p-component-md", className)}
    {...props}
  >
    {children}
  </div>
);

Card.Image = ({
  src,
  alt,
  className,
  ...props
}: {
  src: string;
  alt: string;
  className?: string;
  [key: string]: any;
}) => (
  <img
    src={src}
    alt={alt}
    className={cn("h-auto w-full", className)}
    {...props}
  />
);

Card.Title = ({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}) => (
  <Text
    as="h3"
    variant="body-lg"
    className={cn("font-semibold", className)}
    {...props}
  >
    {children}
  </Text>
);

Card.Description = ({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}) => (
  <Text
    as="p"
    variant="body-sm"
    className={cn("text-blackCorp/80", className)}
    {...props}
  >
    {children}
  </Text>
);
