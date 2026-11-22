"use client";

import { useState } from "react";
import {
  setHours,
  setMinutes,
  setSeconds,
  addMinutes,
  addDays,
} from "date-fns";
import { useTranslations } from "next-intl";
import type { DatePickerComponentProps, TimeSelectorProps } from "types/props";
import { toLocalDateTimeString } from "@utils/date-helpers";
import { nowInMadrid } from "@utils/constants";
import DateRangeCalendar from "../DateRangeCalendar";

function toDate(dateStr: string): Date {
  if (!dateStr) return setHours(setMinutes(new Date(), 0), 9);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(`${dateStr}T09:00`);
  }
  return new Date(dateStr);
}

function computeEndDate(
  startingDate: Date,
  initialEndDate: string | undefined,
  isAllDay: boolean,
): Date {
  if (isAllDay) {
    const candidate = initialEndDate ? toDate(initialEndDate) : startingDate;
    const baseDate = candidate >= startingDate ? candidate : startingDate;
    return setSeconds(setMinutes(setHours(baseDate, 23), 59), 59);
  }

  const defaultEndDate = new Date(startingDate.getTime() + 60 * 60 * 1000);
  if (!initialEndDate) {
    return defaultEndDate;
  }

  const candidate = toDate(initialEndDate);
  return candidate > startingDate ? candidate : defaultEndDate;
}

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function toYMD(d: Date): string {
  return toLocalDateTimeString(d).slice(0, 10);
}

/** Copies the calendar day of `ymd` onto `time`, keeping its hours and minutes. */
function withDay(ymd: string, time: Date): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const result = new Date(time);
  result.setFullYear(y, m - 1, d);
  return result;
}

function TimeSelector({
  id,
  value,
  onChange,
  minTime,
  label,
}: TimeSelectorProps) {
  return (
    <div className="w-full sm:flex-1 sm:min-w-0">
      <label
        htmlFor={id}
        className="text-sm text-muted-foreground mb-1.5 block font-medium"
      >
        {label}
      </label>
      <input
        id={id}
        type="time"
        value={value}
        min={minTime}
        onChange={(e) => onChange(e.target.value)}
        className="input input-lg"
      />
    </div>
  );
}

export default function DatePickerImpl({
  idPrefix = "date",
  startDate: initialStartDate,
  endDate: initialEndDate,
  onChange,
  required,
  className,
  enableAllDayToggle = false,
  isAllDay = false,
  onToggleAllDay,
}: DatePickerComponentProps) {
  const t = useTranslations("Components.DatePicker");

  const startDate = toDate(initialStartDate);
  const endDate = computeEndDate(startDate, initialEndDate, isAllDay);
  const startYmd = toYMD(startDate);
  const endYmd = toYMD(endDate);
  // New events start today or later. An edited or AI-extracted event may
  // already have started, so its original start day stays selectable.
  const [initialFloor] = useState(() => {
    const today = toYMD(nowInMadrid());
    return startYmd < today ? startYmd : today;
  });
  const firstDay = startYmd < initialFloor ? startYmd : initialFloor;
  const allDaySwitchId = `${idPrefix}-all-day-switch`;
  const [startDraft, setStartDraft] = useState<string | null>(null);
  const [endDraft, setEndDraft] = useState<string | null>(null);
  const [shownStartYmd, setShownStartYmd] = useState(startYmd);
  const [shownEndYmd, setShownEndYmd] = useState(endYmd);
  if (shownStartYmd !== startYmd) {
    setShownStartYmd(startYmd);
    if (startDraft !== null) setStartDraft(null);
  }
  if (shownEndYmd !== endYmd) {
    setShownEndYmd(endYmd);
    if (endDraft !== null) setEndDraft(null);
  }
  const [calendarFocusDate, setCalendarFocusDate] = useState<string | undefined>(
    undefined,
  );

  const isPlausibleYmd = (value: string) => /^[1-9]\d{3}-\d{2}-\d{2}$/.test(value);

  const handleRangeChange = (from: string, to: string) => {
    if (!from) return;
    setStartDraft(null);
    setEndDraft(null);
    const newStart = withDay(from, startDate);
    let newEnd = withDay(to || from, endDate);

    if (isAllDay) {
      newEnd = setSeconds(setMinutes(setHours(newEnd, 23), 59), 59);
    } else if (newEnd <= newStart) {
      // Same end day as the start but an earlier time: an overnight event
      // (22:00 to 02:00) ends the next day, so keep that time-of-day length.
      newEnd = addDays(withDay(from, endDate), 1);
    }

    onChange("startDate", toLocalDateTimeString(newStart));
    onChange("endDate", toLocalDateTimeString(newEnd));
  };

  const handleStartDayInput = (nextStartYmd: string) => {
    if (!isPlausibleYmd(nextStartYmd)) {
      setStartDraft(nextStartYmd);
      return;
    }
    const nextEndYmd = endYmd >= nextStartYmd ? endYmd : nextStartYmd;
    setCalendarFocusDate(nextStartYmd);
    handleRangeChange(nextStartYmd, nextEndYmd);
  };

  const handleStartDayBlur = () => {
    if (startDraft === null) return;
    const candidate = startDraft;
    setStartDraft(null);
    if (isPlausibleYmd(candidate)) {
      const nextEndYmd = endYmd >= candidate ? endYmd : candidate;
      setCalendarFocusDate(candidate);
      handleRangeChange(candidate, nextEndYmd);
    }
  };

  const handleEndDayInput = (nextEndYmd: string) => {
    if (!isPlausibleYmd(nextEndYmd) || nextEndYmd < startYmd) {
      setEndDraft(nextEndYmd);
      return;
    }
    setCalendarFocusDate(nextEndYmd);
    handleRangeChange(startYmd, nextEndYmd);
  };

  const handleEndDayBlur = () => {
    if (endDraft === null) return;
    const candidate = endDraft;
    setEndDraft(null);
    if (isPlausibleYmd(candidate)) {
      const clampedEnd = candidate < startYmd ? startYmd : candidate;
      setCalendarFocusDate(clampedEnd);
      handleRangeChange(startYmd, clampedEnd);
    }
  };

  const handleStartTimeChange = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    const newStart = new Date(startDate);
    newStart.setHours(h, m, 0, 0);
    onChange("startDate", toLocalDateTimeString(newStart));

    if (newStart >= endDate) {
      const newEnd = addMinutes(newStart, 60);
      onChange("endDate", toLocalDateTimeString(newEnd));
    }
  };

  const handleEndTimeChange = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    const newEnd = new Date(endDate);
    newEnd.setHours(h, m, 0, 0);

    const corrected = newEnd <= startDate ? addMinutes(startDate, 15) : newEnd;
    onChange("endDate", toLocalDateTimeString(corrected));
  };

  const isSameDay = startDate.toDateString() === endDate.toDateString();

  return (
    <div className={`w-full flex flex-col gap-4 ${className ?? ""}`}>
      <div className="flex justify-between items-center">
        <span className="form-label">{t("dateAndTime")}</span>

        {enableAllDayToggle && (
          <label
            htmlFor={allDaySwitchId}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <div className="relative">
              <input
                id={allDaySwitchId}
                type="checkbox"
                role="switch"
                aria-checked={isAllDay}
                className="peer sr-only"
                checked={isAllDay}
                onChange={(e) => onToggleAllDay?.(e.target.checked)}
              />
              <div
                className={`w-11 h-6 rounded-full border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 ${isAllDay ? "bg-primary border-primary" : "bg-background border-muted-foreground"}`}
              />
              <div
                className={`absolute left-1 top-1 w-4 h-4 rounded-full transition-transform ${isAllDay ? "bg-white translate-x-5" : "bg-muted-foreground"}`}
              />
            </div>
            <span className="text-sm text-foreground-strong">
              {t("allDay")}
            </span>
          </label>
        )}
      </div>

      <DateRangeCalendar
        fromDate={startYmd}
        toDate={endYmd}
        minDate={firstDay}
        focusDate={calendarFocusDate}
        required={required}
        onChange={handleRangeChange}
      />

      <div className="flex flex-col sm:flex-row gap-4 w-full">
        <div className="w-full sm:flex-1 sm:min-w-0">
          <label
            htmlFor={`${idPrefix}-start-date`}
            className="body-small text-muted-foreground mb-1.5 block font-medium"
          >
            {t("startDate")}
          </label>
          <input
            id={`${idPrefix}-start-date`}
            type="date"
            value={startDraft ?? startYmd}
            min={firstDay}
            onChange={(e) => handleStartDayInput(e.target.value)}
            onBlur={handleStartDayBlur}
            className="input input-lg"
          />
        </div>
        <div className="w-full sm:flex-1 sm:min-w-0">
          <label
            htmlFor={`${idPrefix}-end-date`}
            className="body-small text-muted-foreground mb-1.5 block font-medium"
          >
            {t("endDate")}
          </label>
          <input
            id={`${idPrefix}-end-date`}
            type="date"
            value={endDraft ?? endYmd}
            min={startYmd}
            onChange={(e) => handleEndDayInput(e.target.value)}
            onBlur={handleEndDayBlur}
            className="input input-lg"
          />
        </div>
      </div>

      {!isAllDay && (
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <TimeSelector
            id={`${idPrefix}-start-time`}
            label={t("startTime")}
            value={formatTime(startDate)}
            onChange={handleStartTimeChange}
          />
          <TimeSelector
            id={`${idPrefix}-end-time`}
            label={t("endTime")}
            value={formatTime(endDate)}
            minTime={isSameDay ? formatTime(startDate) : undefined}
            onChange={handleEndTimeChange}
          />
        </div>
      )}
    </div>
  );
}
