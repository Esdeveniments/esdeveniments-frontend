import type { CalendarParams, CalendarUrls, CalendarLabels } from "types/calendar";

import * as React from "react";

const parseCalendarDate = (date: unknown): Date | null => {
  if (date instanceof Date) {
    if (Number.isNaN(date.getTime())) return null;
    return date;
  }

  if (typeof date !== "string") return null;

  const trimmedDate = date.trim();
  if (trimmedDate === "") return null;
  if (!/^\d{4}-\d{2}-\d{2}(?:T|\s|$)/.test(trimmedDate)) return null;

  const parsedDate = new Date(trimmedDate);
  if (Number.isNaN(parsedDate.getTime())) return null;
  return parsedDate;
};

const formatDate = (date: Date): string =>
  date.toISOString().replace(/-|:|\.\d+/g, "");

const encodeParams = (params: Record<string, string>): string =>
  Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");

const createUrl = (base: string, params: Record<string, string>): string =>
  `${base}?${encodeParams(params)}`;

const escapeIcsText = (value: string): string =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");

const createIcalDataUri = (lines: string[]): string =>
  `data:text/calendar;charset=utf8,${encodeURIComponent(lines.join("\r\n"))}`;

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
  const parsedStart = parseCalendarDate(startDate);
  if (!parsedStart) {
    return { google: "", outlook: "", ical: "" };
  }

  const parsedEnd = parseCalendarDate(endDate);
  const safeEnd =
    parsedEnd && parsedEnd >= parsedStart ? parsedEnd : parsedStart;
  const start = formatDate(parsedStart);
  const end = formatDate(safeEnd);

  const moreInfoHtml = labels.moreInfoHtml.replace("{url}", canonical);
  const moreInfoText = labels.moreInfoText.replace("{url}", canonical);

  const htmlDescription = `${description.trim()}<br><br>${moreInfoHtml}`;
  const plainDescription = `${description.trim()}\n\n${moreInfoText}`;
  const safeCanonical = canonical.replace(/[\r\n]/g, "");
  const uidToken =
    `${safeCanonical}-${start}`
      .replace(/[^A-Za-z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "event";

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

  const iCalLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Esdeveniments.cat//Calendar//CA",
    "BEGIN:VEVENT",
    `UID:${uidToken}@esdeveniments.cat`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(plainDescription)}`,
    `LOCATION:${escapeIcsText(location)}`,
    `URL:${safeCanonical}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return {
    google: createUrl("https://www.google.com/calendar/render", googleParams),
    outlook: createUrl("https://outlook.live.com/owa/", outlookParams),
    ical: createIcalDataUri(iCalLines),
  };
};
