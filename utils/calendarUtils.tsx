import type { CalendarParams, CalendarUrls, CalendarLabels } from "types/calendar";

import * as React from "react";

const formatDate = (date: string | Date): string =>
  new Date(date).toISOString().replace(/-|:|\.\d+/g, "");

const encodeParams = (params: Record<string, string>): string =>
  Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");

const createUrl = (base: string, params: Record<string, string>): string =>
  `${base}?${encodeParams(params)}`;

// Utility to format event date as string and JSX with <time> for accessibility
export function formatEventDateRange(
  startDate: string,
  endDate?: string,
  labels?: Pick<CalendarLabels, "dateRange" | "dateSingle">
): { string: string; jsx: React.ReactNode } {
  const dateLabels = labels;
  if (endDate) {
    const str = (dateLabels?.dateRange || "")
      .replace("{start}", startDate)
      .replace("{end}", endDate);
    return {
      string: str,
      jsx: (
        <>
          <time dateTime={startDate}>{str}</time>
        </>
      ),
    };
  } else {
    const str = (dateLabels?.dateSingle || "").replace("{start}", startDate);
    return {
      string: str,
      jsx: <time dateTime={startDate}>{str}</time>,
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
  labels,
}: CalendarParams & { labels: CalendarLabels }): CalendarUrls => {
  const start = formatDate(startDate);
  const end = formatDate(endDate);

  const moreInfoHtml = labels.moreInfoHtml.replace("{url}", canonical);
  const moreInfoText = labels.moreInfoText.replace("{url}", canonical);

  const htmlDescription = `${description.trim()}<br><br>${moreInfoHtml}`;
  const plainDescription = `${description.trim()}\n\n${moreInfoText}`;

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
