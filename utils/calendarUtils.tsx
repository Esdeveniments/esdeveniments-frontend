import type { CalendarParams, CalendarUrls } from "types/calendar";

const formatDate = (date: string | Date): string =>
  new Date(date).toISOString().replace(/-|:|\.\d+/g, "");

const encodeParams = (params: Record<string, string>): string =>
  Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");

const createUrl = (base: string, params: Record<string, string>): string =>
  `${base}?${encodeParams(params)}`;

import * as React from "react";

// Utility to format event date as string and JSX with <time> for accessibility
export function formatEventDateRange(
  startDate: string,
  endDate?: string
): { string: string; jsx: React.ReactNode } {
  if (endDate) {
    return {
      string: `Del ${startDate} al ${endDate}`,
      jsx: (
        <>
          <time dateTime={startDate}>Del {startDate}</time> al{" "}
          <time dateTime={endDate}>{endDate}</time>
        </>
      ),
    };
  } else {
    return {
      string: `${startDate}`,
      jsx: <time dateTime={startDate}>{startDate}</time>,
    };
  }
}

export const generateCalendarUrls = ({
  title,
  description,
  location,
  startDate,
  endDate,
  canonical,
}: CalendarParams): CalendarUrls => {
  const start = formatDate(startDate);
  const end = formatDate(endDate);

  const htmlDescription = `${description.trim()}<br><br>Més informació: <a href="${canonical}" target="_blank" rel="noopener noreferrer">Esdeveniments.cat</a>`;
  const plainDescription = `${description.trim()}\n\nMés informació: ${canonical}`;

  const googleParams = {
    action: "TEMPLATE",
    text: title,
    dates: `${start}/${end}`,
    details: htmlDescription,
    location,
  };

  const outlookParams = {
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: title,
    startdt: start,
    enddt: end,
    body: plainDescription,
    location,
  };

  const iCalParams = {
    BEGIN: "VCALENDAR",
    VERSION: "2.0",
    BEGIN_2: "VEVENT",
    DTSTART: start,
    DTEND: end,
    SUMMARY: title,
    DESCRIPTION: plainDescription,
    LOCATION: location,
    END: "VEVENT",
    END_2: "VCALENDAR",
  };

  return {
    google: createUrl("https://www.google.com/calendar/render", googleParams),
    outlook: createUrl("https://outlook.live.com/owa/", outlookParams),
    ical: `data:text/calendar;charset=utf8,${encodeParams(iCalParams).replace(
      /&/g,
      "%0D%0A"
    )}`,
  };
};
