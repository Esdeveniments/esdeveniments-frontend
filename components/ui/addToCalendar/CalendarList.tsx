import { memo, useCallback, useEffect, FC } from "react";
import Image from "next/image";
import { sendGoogleEvent } from "@utils/analytics";
import type { CalendarOption, CalendarListProps } from "types/common";

const CalendarList: FC<CalendarListProps> = ({ onClick, getUrls, title }) => {
  const urls = getUrls();

  const handleCalendarClick = useCallback(
    (calendarType: string): void => {
      sendGoogleEvent("add_to_calendar", {
        event_category: "Calendar",
        event_label: calendarType,
        event_title: title,
      });
      setTimeout(onClick, 500);
    },
    [onClick, title]
  );

  const calendarOptions: CalendarOption[] = [
    {
      name: "Google Calendar",
      url: urls.google,
      icon: "google-calendar.png",
    },
    {
      name: "Outlook",
      url: urls.outlook,
      icon: "outlook.jpeg",
    },
    {
      name: "Altres",
      url: urls.ical,
      icon: "ical.png",
      download: `${title}.ics`,
    },
  ];

  const linkClass = "block mb-6 last:mb-0 hover:underline";
  const buttonClass = "btn flex items-center justify-center space-x-2";

  useEffect(() => {
    sendGoogleEvent("add_to_calendar_view", { event_title: title });
  }, [title]);

  return (
    <div className="absolute top-full left-0 mt-2 z-10 bg-background">
      <div className="shadow-md rounded-md p-4 border border-border animate-appear">
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
                aria-label={`Add to ${option.name}`}
              >
                <button className={buttonClass} aria-label={option.name}>
                  <Image
                    src={`/static/images/icons/${option.icon}`}
                    alt={`${option.name} icon`}
                    width={20}
                    height={20}
                  />
                  <span className="flex items-center">{option.name}</span>
                </button>
              </a>
            )
        )}
      </div>
    </div>
  );
};

CalendarList.displayName = "CalendarList";

export default memo(CalendarList);
