"use client";

import { memo, useCallback, useEffect, FC } from "react";
import Image from "next/image";
import { sendGoogleEvent } from "@utils/analytics";
import useTrackedCta from "@components/hooks/useTrackedCta";
import type { CalendarOption, CalendarListProps } from "types/common";

const CalendarList: FC<CalendarListProps> = ({
  onClick,
  getUrls,
  title,
  labels,
}) => {
  const urls = getUrls();
  const { ref: ctaRef, trackClick } = useTrackedCta<HTMLDivElement>("add_to_calendar");

  const handleCalendarClick = useCallback(
    (calendarType: string): void => {
      trackClick();
      sendGoogleEvent("add_to_calendar", {
        method: calendarType,
        event_category: "Calendar",
        event_label: calendarType,
        event_title: title,
      });
      setTimeout(onClick, 500);
    },
    [onClick, title, trackClick]
  );

  const calendarOptions: CalendarOption[] = [
    {
      name: labels.google,
      url: urls.google,
      icon: "google-calendar.png",
    },
    {
      name: labels.outlook,
      url: urls.outlook,
      icon: "outlook.jpeg",
    },
    {
      name: labels.other,
      url: urls.ical,
      icon: "ical.png",
      download: `${title}.ics`,
    },
  ];

  const linkClass =
    "flex items-center gap-2 min-h-button px-3 rounded-button body-small text-foreground-strong hover:bg-muted transition-colors focus-ring";

  useEffect(() => {
    sendGoogleEvent("add_to_calendar_view", { event_title: title });
  }, [title]);

  return (
    <div ref={ctaRef} className="absolute top-full left-0 mt-2 z-10">
      <div className="w-56 bg-background shadow-md rounded-card p-1 border border-border animate-appear flex flex-col">
        {calendarOptions.map(
          (option) =>
            option.url && (
              <a
                key={option.name}
                href={option.url}
                target="_blank"
                rel="noopener noreferrer"
                download={option.download}
                className={linkClass}
                onClick={() => handleCalendarClick(option.name)}
                aria-label={labels.ariaAdd.replace("{name}", option.name)}
              >
                <Image
                  src={`/static/images/icons/${option.icon}`}
                  alt=""
                  width={20}
                  height={20}
                />
                <span>{option.name}</span>
              </a>
            )
        )}
      </div>
    </div>
  );
};

CalendarList.displayName = "CalendarList";

export default memo(CalendarList);
