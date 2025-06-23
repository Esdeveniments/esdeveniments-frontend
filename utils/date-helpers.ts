import { DAYS, MONTHS } from "./constants";
import type { DateObject, FormattedDateResult } from "types/event";
import type { EventTimeDTO } from "types/api/event";

export const isLessThanFiveDays = (date: Date): boolean => {
  const currentDate = new Date();
  const timeDiff = currentDate.getTime() - date.getTime();
  const dayDiff = timeDiff / (1000 * 3600 * 24);
  return Math.floor(Math.abs(dayDiff)) < 5;
};

export const convertTZ = (date: Date | string, tzString: string): Date =>
  new Date(
    (typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", {
      timeZone: tzString,
    })
  );

function calculateDetailedDurationISO8601(start: Date, end: Date): string {
  const differenceInMs = end.getTime() - start.getTime();

  const days = Math.floor(differenceInMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (differenceInMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((differenceInMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((differenceInMs % (1000 * 60)) / 1000);

  let duration = "P";
  if (days > 0) duration += `${days}D`;

  if (hours > 0 || minutes > 0 || seconds > 0) {
    duration += "T";
    if (hours > 0) duration += `${hours}H`;
    if (minutes > 0) duration += `${minutes}M`;
    if (seconds > 0) duration += `${seconds}S`;
  }

  return duration === "P" ? "PT1H" : duration;
}

export const getFormattedDate = (
  start: string | DateObject,
  end?: string | DateObject
): FormattedDateResult => {
  const startDate = new Date(
    typeof start === "object" ? start.date || start.dateTime || "" : start
  );
  const endDate = end
    ? new Date(typeof end === "object" ? end.date || end.dateTime || "" : end)
    : startDate;

  const startDateConverted = convertTZ(startDate, "Europe/Madrid");
  const endDateConverted = convertTZ(endDate, "Europe/Madrid");
  const duration = calculateDetailedDurationISO8601(startDate, endDate);

  let isMultipleDays = false;
  let isSameMonth = false;
  let isSameYear = false;
  const startDay = startDateConverted.getDate();
  const endDay = endDateConverted.getDate();

  if (startDay !== endDay) isMultipleDays = true;
  if (startDateConverted.getMonth() === endDateConverted.getMonth())
    isSameMonth = true;
  if (startDateConverted.getFullYear() === endDateConverted.getFullYear())
    isSameYear = true;

  const weekDay = startDateConverted.getDay();
  const month = startDateConverted.getMonth();
  const year = startDateConverted.getFullYear();
  const nameDay = DAYS[weekDay];
  const nameMonth = MONTHS[month];

  const originalFormattedStart = `${startDay} de ${nameMonth} del ${year}`;
  const formattedStart =
    isMultipleDays && isSameMonth
      ? `${startDay}`
      : `${startDay} de ${nameMonth}${
          isMultipleDays && isSameYear ? "" : ` del ${year}`
        }`;
  const formattedEnd = `${endDay} de ${
    MONTHS[endDateConverted.getMonth()]
  } del ${endDateConverted.getFullYear()}`;

  const startTime = `${startDateConverted.getHours()}:${String(
    startDateConverted.getMinutes()
  ).padStart(2, "0")}`;
  const endTime = `${endDateConverted.getHours()}:${String(
    endDateConverted.getMinutes()
  ).padStart(2, "0")}`;

  return {
    originalFormattedStart,
    formattedStart,
    formattedEnd: isMultipleDays ? formattedEnd : null,
    startTime,
    endTime,
    nameDay,
    startDate: isMultipleDays
      ? (startDay <= new Date().getDate() &&
          convertTZ(new Date(), "Europe/Madrid")) ||
        startDateConverted
      : startDateConverted,
    isLessThanFiveDays: isLessThanFiveDays(startDate),
    isMultipleDays,
    duration,
  };
};

export const nextDay = (x: number): Date => {
  const now = new Date();
  now.setDate(now.getDate() + ((x + (7 - now.getDay())) % 7));
  const convertedDate = convertTZ(now, "Europe/Madrid");
  return convertedDate;
};

export const isWeekend = (): boolean => {
  const today = new Date();
  return today.getDay() === 0 || today.getDay() === 5 || today.getDay() === 6;
};

export const monthsName: string[] = [
  "gener",
  "febrer",
  "març",
  "abril",
  "maig",
  "juny",
  "juliol",
  "agost",
  "setembre",
  "octubre",
  "novembre",
  "desembre",
];

/**
 * Converts ISO time string or Date to EventTimeDTO shape for backend requests.
 * Provides a default fallback for invalid or empty input.
 * Accepts:
 *   - "14:30:00" or "14:30" (ISO time format)
 *   - Date object
 *   - null/undefined returns default { hour: 0, minute: 0, second: 0, nano: 0 }
 */
export function parseTimeToEventTimeDTO(
  dateOrString: Date | string | null | undefined
): EventTimeDTO {
  if (
    !dateOrString ||
    (typeof dateOrString === "string" && dateOrString.trim() === "")
  ) {
    return { hour: 0, minute: 0, second: 0, nano: 0 };
  }
  let date: Date | null = null;

  if (typeof dateOrString === "string") {
    const parts = dateOrString.split(":");
    if (parts.length < 2 || parts.length > 3) {
      return { hour: 0, minute: 0, second: 0, nano: 0 };
    }
    const [h, m, s] = parts.map(Number);
    // Validate numbers and ranges
    if (
      isNaN(h) ||
      isNaN(m) ||
      (parts.length === 3 && isNaN(s)) ||
      h < 0 ||
      h > 23 ||
      m < 0 ||
      m > 59 ||
      (typeof s === "number" && (s < 0 || s > 59))
    ) {
      return { hour: 0, minute: 0, second: 0, nano: 0 };
    }
    date = new Date(1970, 0, 1, h, m, s || 0);
  } else if (dateOrString instanceof Date && !isNaN(dateOrString.getTime())) {
    date = dateOrString;
  }
  if (!date) {
    return { hour: 0, minute: 0, second: 0, nano: 0 };
  }

  return {
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
    nano: 0,
  };
}

/**
 * Convert Date object to LocalDate format (YYYY-MM-DD) for API compatibility
 * @param date - Date object to convert
 * @returns string in YYYY-MM-DD format
 */
export const toLocalDateString = (date: Date): string => {
  return date.toISOString().slice(0, 10);
};

/**
 * Format time string for API compatibility (HH:mm format)
 * @param timeString - Time string in various formats
 * @returns string in HH:mm format or empty string if invalid
 */
export const formatTimeForAPI = (timeString: string): string => {
  if (!timeString || !timeString.includes(":")) return "";
  const [hour, minute] = timeString.split(":");
  return `${hour}:${minute}`;
};

/**
 * Format time from API response (EventTimeDTO) to string format
 * @param timeObj - EventTimeDTO object from API
 * @returns string in HH:mm format
 */
export const formatTimeFromAPI = (timeObj: EventTimeDTO): string => {
  const hour = String(timeObj.hour).padStart(2, "0");
  const minute = String(timeObj.minute).padStart(2, "0");
  return `${hour}:${minute}`;
};
