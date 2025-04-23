import { useEffect, useState, useRef, JSX, RefObject } from "react";
import dynamic from "next/dynamic";
import Script from "next/script";
import { useRouter } from "next/router";
import {
  PencilIcon,
  XIcon,
  LocationMarkerIcon as LocationIcon,
  ChevronDownIcon,
  CalendarIcon,
  CloudIcon,
  InformationCircleIcon as InfoIcon,
  ArrowRightIcon,
  SpeakerphoneIcon,
  ShareIcon,
  GlobeAltIcon as WebIcon,
} from "@heroicons/react/outline";
import { useGetEvent } from "@components/hooks/useGetEvent";
import Meta from "@components/partials/seo-meta";
import { generateJsonData } from "@utils/helpers";
import ReportView from "@components/ui/reportView";
import useOnScreen from "@components/hooks/useOnScreen";
import { siteUrl } from "@config/index";
import { sendGoogleEvent } from "@utils/analytics";
import useCheckMobileScreen from "@components/hooks/useCheckMobileScreen";
import AddToCalendar from "@components/ui/addToCalendar";
import type { QueryParams, DeleteReason } from "types/event";
import { EventDetailResponseDTO } from "types/api/event";
import { fetchEventById } from "@lib/api/events";

const AdArticle = dynamic(() => import("@components/ui/adArticle"), {
  loading: () => null,
  ssr: false,
});

const Image = dynamic(() => import("@components/ui/common/image"), {
  loading: () => (
    <div className="flex justify-center items-center w-full">
      <div className="w-full h-60 bg-darkCorp animate-fast-pulse"></div>
    </div>
  ),
});

const EditModal = dynamic(() => import("@components/ui/editModal"), {
  loading: () => null,
  ssr: false,
});

const Maps = dynamic(() => import("@components/ui/maps"), {
  loading: () => null,
  ssr: false,
});

const NoEventFound = dynamic(
  () => import("@components/ui/common/noEventFound"),
  {
    loading: () => null,
    ssr: false,
  }
);

const Notification = dynamic(
  () => import("@components/ui/common/notification"),
  {
    loading: () => null,
    ssr: false,
  }
);

const Weather = dynamic(() => import("@components/ui/weather"), {
  loading: () => null,
  ssr: false,
});

const ImageDefault = dynamic(() => import("@components/ui/imgDefault"), {
  loading: () => null,
});

const EventsAround = dynamic(() => import("@components/ui/eventsAround"), {
  loading: () => null,
  ssr: false,
});

const Tooltip = dynamic(() => import("@components/ui/tooltip"), {
  loading: () => null,
  ssr: false,
});

const Description = dynamic(() => import("@components/ui/common/description"), {
  loading: () => null,
});

const VideoDisplay = dynamic(
  () => import("@components/ui/common/videoDisplay"),
  {
    loading: () => null,
  }
);

const ViewCounter = dynamic(() => import("@components/ui/viewCounter"), {
  loading: () => null,
  ssr: false,
});

const CardShareButton = dynamic(
  () => import("@components/ui/common/cardShareButton"),
  {
    loading: () => null,
    ssr: false,
  }
);

const NativeShareButton = dynamic(
  () => import("@components/ui/common/nativeShareButton"),
  {
    loading: () => null,
    ssr: false,
  }
);

const sanitizeInput = (input: string): string =>
  input
    .replace(/(<([^>]+)>)/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/"/gi, "")
    .replace(/\n/gi, " ")
    .trim();

const smartTruncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  const lastSpaceIndex = text.substring(0, maxLength).lastIndexOf(" ");
  return lastSpaceIndex > maxLength - 20
    ? text.substring(0, lastSpaceIndex)
    : text.substring(0, maxLength);
};

function generateMetaDescription(title: string, description: string): string {
  const titleSanitized = sanitizeInput(title);
  let metaDescription = titleSanitized;

  if (metaDescription.length < 120) {
    const descriptionSanitized = sanitizeInput(description);
    metaDescription += ` - ${descriptionSanitized}`;
  }

  return smartTruncate(metaDescription, 156);
}

function sanitizeAndTrim(input: string): string {
  return sanitizeInput(input).trim();
}

function appendIfFits(base: string, addition: string): string {
  const potentialTitle = `${base} - ${addition}`;
  return potentialTitle.length <= 60 ? potentialTitle : base;
}

function generateMetaTitle(
  title: string,
  description: string,
  location: string,
  town: string,
  region: string
): string {
  const titleSanitized = sanitizeAndTrim(title);
  let metaTitle = smartTruncate(titleSanitized, 60);
  const titleParts: string[] = [];

  if (location) {
    titleParts.push(sanitizeAndTrim(location));
  }

  if (town && sanitizeAndTrim(town) !== titleParts[0]) {
    titleParts.push(sanitizeAndTrim(town));
  }

  if (region && !titleParts.includes(sanitizeAndTrim(region))) {
    titleParts.push(sanitizeAndTrim(region));
  }

  titleParts.forEach((part) => {
    metaTitle = appendIfFits(metaTitle, part);
  });

  if (
    description &&
    sanitizeAndTrim(description) !== "" &&
    metaTitle.length < 50
  ) {
    metaTitle = appendIfFits(metaTitle, sanitizeAndTrim(description));
  }

  return metaTitle;
}

function renderEventImage(
  image: string | undefined,
  title: string,
  location: string,
  nameDay: string,
  formattedStart: string
): JSX.Element {
  if (image) {
    return (
      <a
        href={image}
        className="flex justify-center"
        target="_blank"
        rel="image_src noreferrer"
      >
        <Image
          alt={title}
          title={title}
          image={image}
          className="w-full object-center object-cover"
          priority={true}
        />
      </a>
    );
  }

  const date = `${nameDay} ${formattedStart}`;

  return (
    <div className="w-full">
      <div className="w-full border-t"></div>
      <ImageDefault date={date} location={location} subLocation={title} />
    </div>
  );
}

export default function Event(props: {
  event: EventDetailResponseDTO;
}): JSX.Element {
  const mapsRef = useRef<HTMLDivElement>(null) as RefObject<HTMLDivElement>;
  const weatherRef = useRef<HTMLDivElement>(null) as RefObject<HTMLDivElement>;
  const eventsAroundRef = useRef<HTMLDivElement>(
    null
  ) as RefObject<HTMLDivElement>;
  const editModalRef = useRef<HTMLDivElement>(
    null
  ) as RefObject<HTMLDivElement>;
  const mapsDivRef = useRef<HTMLDivElement>(null);
  const weatherDivRef = useRef<HTMLDivElement>(null);
  const eventsAroundDivRef = useRef<HTMLDivElement>(null);
  const editModalDivRef = useRef<HTMLDivElement>(null);

  const isMapsVisible = useOnScreen(mapsRef as RefObject<Element>, {
    freezeOnceVisible: true,
  });
  const isWeatherVisible = useOnScreen(weatherRef as RefObject<Element>, {
    freezeOnceVisible: true,
  });
  const isEditModalVisible = useOnScreen(editModalRef as RefObject<Element>, {
    freezeOnceVisible: true,
  });
  const isEventsAroundVisible = useOnScreen(
    eventsAroundRef as RefObject<Element>,
    {
      freezeOnceVisible: true,
    }
  );

  const { query } = useRouter();
  const { newEvent, edit_suggested = false } = query as QueryParams;
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [openDeleteReasonModal, setOpenModalDeleteReasonModal] =
    useState<boolean>(false);
  const [showThankYouBanner, setShowThankYouBanner] =
    useState<boolean>(edit_suggested);
  const [reasonToDelete, setReasonToDelete] = useState<DeleteReason>(null);
  const [showMap, setShowMap] = useState<boolean>(false);

  const event = useGetEvent(props);
  const slug = event?.slug ?? "";
  const title = event?.title ?? "";
  const isMobile = useCheckMobileScreen();

  useEffect(() => {
    sendGoogleEvent("view_event_page", {});
  }, []);

  const onSendDeleteReason = async (): Promise<void> => {
    if (!event) return;

    const { id, title } = event;
    setOpenModalDeleteReasonModal(false);

    const rawResponse = await fetch(
      process.env.NEXT_PUBLIC_DELETE_EVENT ?? "",
      {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          title,
          reason: reasonToDelete,
          isProduction: process.env.NODE_ENV === "production",
        }),
      }
    );

    const { success } = await rawResponse.json();

    if (success) setShowThankYouBanner(true);

    sendGoogleEvent("send-delete", {
      value: reasonToDelete,
    });
  };

  const onRemove = (): void => {
    setOpenModal(false);
    setTimeout(() => setOpenModalDeleteReasonModal(true), 300);
    sendGoogleEvent("open-delete-modal", {});
  };

  const handleShowMap = (): void => {
    setShowMap(!showMap);
  };

  if (!event) return <NoEventFound />;

  const {
    id,
    description,
    location,
    city,
    region,
    startDate,
    endDate,
    startTime,
    endTime,
    imageUrl,
    url,
  } = event;
  const cityName = city?.name || "";
  const regionName = region?.name || "";

  const eventDate = endDate ? (
    <>
      <time dateTime={startDate}>Del {startDate}</time> al{" "}
      <time dateTime={endDate}>{endDate}</time>
    </>
  ) : (
    <>
      <time dateTime={startDate}>{startDate}</time>
    </>
  );

  const eventDateString = endDate
    ? `Del ${startDate} al ${endDate}`
    : `${startDate}`;

  const jsonData = generateJsonData({ ...event });

  if (title === "CANCELLED") return <NoEventFound />;

  const handleDirectionsClick = (): void => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        location
      )}`,
      "_blank"
    );
  };

  return (
    <>
      <Meta
        title={generateMetaTitle(title, "", location, cityName, regionName)}
        description={generateMetaDescription(
          `${title} - ${startDate} - ${location}, ${cityName}, ${regionName}`,
          description
        )}
        canonical={`${siteUrl}/e/${slug}`}
        image={imageUrl || ""}
        preload="/static/images/gMaps.webp"
      />
      <Script
        id={id}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonData) }}
      />
      <ReportView slug={slug} />
      {newEvent && <Notification title={title} url={slug} />}
      {showThankYouBanner && (
        <Notification
          customNotification={false}
          hideClose
          hideNotification={setShowThankYouBanner}
          title="Gràcies per contribuir a millorar el contingut de Esdeveniments.cat! En menys de 24 hores estarà disponible el canvi."
        />
      )}
      {/* General */}
      <div className="w-full flex justify-center bg-whiteCorp pb-10">
        <div className="w-full flex flex-col justify-center items-center gap-4 sm:w-[520px] md:w-[520px] lg:w-[520px]">
          <article className="w-full flex flex-col justify-center items-start gap-8">
            {/* Image */}
            <div className="w-full flex flex-col justify-center items-start gap-4">
              {url ? (
                <VideoDisplay videoUrl={url} />
              ) : (
                renderEventImage(
                  imageUrl,
                  title,
                  location,
                  startDate,
                  startDate
                )
              )}
              {/* ShareButton */}
              <div className="w-full flex justify-between items-center px-4 h-2">
                {!isMobile ? (
                  <CardShareButton slug={slug} />
                ) : (
                  <NativeShareButton
                    title={title}
                    url={slug}
                    date={eventDateString}
                    location={location}
                    subLocation={`${cityName}, ${regionName}`}
                  />
                )}
                <ViewCounter slug={slug} />
              </div>
            </div>
            {/* Small date and title */}
            <div className="w-full flex flex-col justify-start items-start gap-2 px-4">
              <p className="font-semibold">{eventDate}</p>
              <h1 className="w-full uppercase">{title}</h1>
            </div>
            {/* Full date */}
            <div className="w-full flex justify-center items-start gap-2 px-4">
              <CalendarIcon className="w-5 h-5 mt-1" />
              <div className="w-11/12 flex flex-col gap-4">
                <h2>Data i hora</h2>
                <div className="w-full flex flex-col gap-4">
                  <p>{eventDate}</p>
                  <p className="capitalize">
                    {endDate
                      ? `${startTime} - ${endTime}`
                      : "Consultar horaris"}
                  </p>
                </div>
                <AddToCalendar
                  title={title}
                  description={description}
                  location={`${location}, ${cityName}, ${regionName}`}
                  startDate={startDate}
                  endDate={endDate}
                  canonical={`${siteUrl}/e/${slug}`}
                />
              </div>
            </div>
            {/* Location */}
            <div className="w-full flex justify-center items-start gap-2 px-4">
              <LocationIcon className="h-5 w-5 mt-1" aria-hidden="true" />
              <div className="w-11/12 flex flex-col gap-4 pr-4">
                <h2>Ubicació</h2>
                {/* Show Map Button */}
                <div className="w-full flex flex-col justify-center items-center gap-4">
                  <div className="w-full flex flex-col justify-center items-start gap-4">
                    <div className="w-full flex flex-col justify-start items-start gap-1">
                      <p>{location}</p>{" "}
                      <p>
                        {cityName}, {regionName}
                      </p>
                    </div>
                    <div
                      className="w-fit flex justify-start items-center gap-2 border-b-2 border-whiteCorp hover:border-b-2 hover:border-blackCorp ease-in-out duration-300 cursor-pointer"
                      onClick={handleShowMap}
                    >
                      <button type="button" className="flex gap-2">
                        <p className="font-medium">Mostrar mapa</p>
                        {showMap ? (
                          <XIcon className="h-5 w-5" aria-hidden="true" />
                        ) : (
                          <ChevronDownIcon
                            className="h-5 w-5"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {showMap && (
              <div
                className="w-full flex flex-col justify-center items-end gap-6"
                ref={mapsDivRef}
              >
                {isMapsVisible && <Maps location={location} />}
                <div className="w-fit flex justify-end items-center gap-2 px-4 border-b-2 border-whiteCorp hover:border-b-2 hover:border-blackCorp ease-in-out duration-300 cursor-pointer">
                  <button
                    className="flex gap-2"
                    onClick={handleDirectionsClick}
                  >
                    <p className="font-medium">Com arribar</p>
                    <ArrowRightIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
            {/* Ad */}
            <div className="w-full h-full flex justify-center items-start px-4 min-h-[250px] gap-2">
              <SpeakerphoneIcon className="w-5 h-5 mt-1" />
              <div className="w-11/12 flex flex-col gap-4">
                <h2>Contingut patrocinat</h2>
                <AdArticle slot="9643657007" />
              </div>
            </div>
            {/* Description */}
            <Description
              description={description}
              location={cityName || regionName}
            />
            {url &&
              renderEventImage(imageUrl, title, location, startDate, startDate)}
            {/* Weather */}
            {/* Use the new weather api when is ready */}
            {false && (
              <div
                className="w-full flex justify-center items-start gap-2 px-4"
                ref={weatherDivRef}
              >
                <CloudIcon className="w-5 h-5 mt-1" />
                <div className="w-11/12 flex flex-col gap-4">
                  <h2>El temps</h2>
                  {isWeatherVisible && (
                    <Weather startDate={startDate} location={cityName} />
                  )}
                </div>
                <span ref={eventsAroundDivRef} />
              </div>
            )}
            {/* More info */}
            <div className="w-full flex justify-center items-start gap-2 px-4">
              <WebIcon className="w-5 h-5 mt-1" />
              <div className="w-11/12 flex flex-col gap-4">
                <h2>Detalls de l&apos;Esdeveniment</h2>{" "}
                <div className="flex justify-start items-center gap-2">
                  <div className="flex items-center gap-1 font-normal">
                    {/* timeUntil */}
                  </div>
                </div>
                {/* durationInHours */}
                {url && (
                  <div className="flex justify-start items-center gap-2">
                    <div className="flex items-center gap-1 font-normal">
                      {/* Durada aproximada: {durationInHours} */}
                    </div>
                  </div>
                )}
                {url && (
                  <div className="font-bold">
                    Enllaç a l&apos;esdeveniment:
                    <a
                      className="text-primary hover:underline font-normal ml-1"
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {title}
                    </a>
                  </div>
                )}
              </div>
            </div>
            {/* EditButton */}
            <div
              className="w-full flex justify-center items-start gap-2 px-4"
              ref={editModalDivRef}
            >
              <PencilIcon className="w-5 h-5 mt-1" />
              <div className="w-11/12 flex flex-col gap-4">
                <h2>Suggerir un canvi</h2>
                {isEditModalVisible && (
                  <div className="w-11/12 flex justify-start items-center gap-2 cursor-pointer">
                    <div
                      onClick={() => {
                        setOpenModal(true);
                        sendGoogleEvent("open-change-modal", {});
                      }}
                      className="gap-2 ease-in-out duration-300 border-whiteCorp hover:border-blackCorp"
                    >
                      <p className="font-medium flex items-center">Editar</p>
                    </div>
                    <InfoIcon
                      className="w-5 h-5"
                      data-tooltip-id="edit-button"
                    />
                    <Tooltip id="edit-button">
                      Si després de veure la informació de l&apos;esdeveniment,
                      <br />
                      veus que hi ha alguna dada erronia o vols ampliar la
                      <br />
                      informació, pots fer-ho al següent enllaç. Revisarem el
                      <br />
                      canvi i actualitzarem l&apos;informació.
                    </Tooltip>
                  </div>
                )}
              </div>
            </div>
            {/* EventsAround */}
            {isEventsAroundVisible && (
              <div className="w-full flex justify-center items-start gap-2 px-4">
                <ShareIcon className="w-5 h-5 mt-1" />
                <div className="w-11/12 flex flex-col gap-4">
                  <h2>Esdeveniments relacionats</h2>
                  <EventsAround
                    id={id}
                    title={title}
                    town={cityName}
                    region={regionName}
                  />
                </div>
              </div>
            )}
            {/* Ad */}
            <div className="w-full h-full flex justify-center items-start px-4 min-h-[250px] gap-2">
              <SpeakerphoneIcon className="w-5 h-5 mt-1" />
              <div className="w-11/12 flex flex-col gap-4">
                <h2>Contingut patrocinat</h2>
                <AdArticle slot="9643657007" />
              </div>
            </div>
          </article>
          {(isEditModalVisible && openModal) || openDeleteReasonModal ? (
            <EditModal
              openModal={openModal}
              setOpenModal={setOpenModal}
              slug={slug}
              setOpenModalDeleteReasonModal={setOpenModalDeleteReasonModal}
              openDeleteReasonModal={openDeleteReasonModal}
              setReasonToDelete={setReasonToDelete}
              reasonToDelete={reasonToDelete}
              onSendDeleteReason={onSendDeleteReason}
              onRemove={onRemove}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}

export async function getStaticPaths() {
  // Revisar si puc fer crida a getEvents
  /* 
    const events = await fetchAllEventIds();

    const paths = events.map((event) => ({
      params: { id: event.id },
    }));
  */
  return {
    paths: [],
    fallback: "blocking",
  };
}

export async function getStaticProps({
  params,
}: {
  params: { eventId: string };
}) {
  try {
    const event = await fetchEventById(params.eventId);

    return {
      props: {
        event,
      },
      revalidate: 60,
    };
  } catch (error) {
    console.error("Error fetching event:", error);
    return {
      notFound: true,
    };
  }
}
