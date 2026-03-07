"use client";

import { useMemo, useState, useCallback } from "react";
import { DayPicker } from "react-day-picker";
import { CalendarIcon } from "@heroicons/react/24/outline";
import { setHours, setMinutes, setSeconds, addMinutes } from "date-fns";
import { ca, es, enUS } from "date-fns/locale";
import type { Locale } from "date-fns";
import { useLocale, useTranslations } from "next-intl";
import type { DatePickerComponentProps } from "types/props";
import "react-day-picker/style.css";

const LOCALE_MAP: Record<string, Locale> = { ca, es, en: enUS };

function toDate(dateStr: string): Date {
  if (!dateStr) return setHours(setMinutes(new Date(), 0), 9);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(`${dateStr}T09:00`);
  }
  return new Date(dateStr);
}

function toISOStringLocalMinutes(date: Date): string {
  return date.toISOString().slice(0, 16);
}

function computeEndDate(
  startingDate: Date,
  initialEndDate: string | undefined,
  isAllDay: boolean,
): Date {
  const initialEndCandidate = initialEndDate
    ? toDate(initialEndDate)
    : setMinutes(startingDate, startingDate.getMinutes() + 60);

  const endingDate =
    initialEndCandidate > startingDate
      ? initialEndCandidate
      : new Date(startingDate.getTime() + 60 * 60 * 1000);

  if (isAllDay) {
    return setSeconds(setMinutes(setHours(startingDate, 23), 59), 59);
  }

  return endingDate;
}

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDateDisplay(d: Date, locale: string): string {
  const dateFnsLocale = LOCALE_MAP[locale] ?? ca;
  return d.toLocaleDateString(dateFnsLocale.code ?? locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function TimeSelector({
  value,
  onChange,
  minTime,
  label,
}: {
  value: string;
  onChange: (time: string) => void;
  minTime?: string;
  label: string;
}) {
  return (
    <input
      type="time"
      value={value}
      min={minTime}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="w-full px-3 py-2 border border-border rounded-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
    />
  );
}

function DateButton({
  label,
  value,
  isOpen,
  onClick,
}: {
  label: string;
  value: string;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full min-h-[44px] px-4 py-3 border rounded-xl text-foreground-strong text-base bg-background hover:border-primary/50 hover:bg-muted/30 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all flex items-center justify-between gap-2 ${isOpen ? "border-primary ring-2 ring-primary/20" : "border-border"}`}
    >
      <span>{value || label}</span>
      <CalendarIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
    </button>
  );
}

export default function DatePickerImpl({
  idPrefix = "date",
  startDate: initialStartDate,
  endDate: initialEndDate,
  minDate,
  onChange,
  required,
  className,
  enableAllDayToggle = false,
  isAllDay = false,
  onToggleAllDay,
}: DatePickerComponentProps) {
  const t = useTranslations("Components.DatePicker");
  const locale = useLocale();
  const dateFnsLocale = LOCALE_MAP[locale] ?? ca;

  const startDate = useMemo(() => toDate(initialStartDate), [initialStartDate]);
  const endDate = useMemo(
    () => computeEndDate(startDate, initialEndDate, isAllDay),
    [startDate, initialEndDate, isAllDay],
  );
  const minDateObj = useMemo(
    () => (minDate ? toDate(minDate) : undefined),
    [minDate],
  );

  const [activeField, setActiveField] = useState<"start" | "end" | null>(null);

  const handleDaySelectStart = useCallback(
    (day: Date | undefined) => {
      if (!day) return;
      const newStart = new Date(day);
      newStart.setHours(startDate.getHours(), startDate.getMinutes(), 0, 0);

      onChange("startDate", toISOStringLocalMinutes(newStart));

      if (isAllDay) {
        const endOfDay = setSeconds(
          setMinutes(setHours(newStart, 23), 59),
          59,
        );
        onChange("endDate", toISOStringLocalMinutes(endOfDay));
        setActiveField(null);
        return;
      }

      const diff = endDate.getTime() - startDate.getTime();
      const newEnd =
        diff > 0
          ? new Date(newStart.getTime() + diff)
          : addMinutes(newStart, 60);
      onChange("endDate", toISOStringLocalMinutes(newEnd));
      // Keep calendar open so user can adjust the time without re-clicking
    },
    [startDate, endDate, isAllDay, onChange],
  );

  const handleDaySelectEnd = useCallback(
    (day: Date | undefined) => {
      if (!day) return;
      const newEnd = new Date(day);
      newEnd.setHours(endDate.getHours(), endDate.getMinutes(), 0, 0);

      const corrected = newEnd < startDate ? addMinutes(startDate, 15) : newEnd;
      onChange("endDate", toISOStringLocalMinutes(corrected));
      // Keep calendar open so user can adjust the time without re-clicking
    },
    [startDate, endDate, onChange],
  );

  const handleStartTimeChange = useCallback(
    (time: string) => {
      const [h, m] = time.split(":").map(Number);
      const newStart = new Date(startDate);
      newStart.setHours(h, m, 0, 0);
      onChange("startDate", toISOStringLocalMinutes(newStart));

      if (newStart >= endDate) {
        const newEnd = addMinutes(newStart, 60);
        onChange("endDate", toISOStringLocalMinutes(newEnd));
      }
    },
    [startDate, endDate, onChange],
  );

  const handleEndTimeChange = useCallback(
    (time: string) => {
      const [h, m] = time.split(":").map(Number);
      const newEnd = new Date(endDate);
      newEnd.setHours(h, m, 0, 0);

      const corrected = newEnd < startDate ? addMinutes(startDate, 15) : newEnd;
      onChange("endDate", toISOStringLocalMinutes(corrected));
    },
    [startDate, endDate, onChange],
  );

  const startDisplay = formatDateDisplay(startDate, locale);
  const endDisplay = formatDateDisplay(endDate, locale);

  return (
    <div className={`w-full flex flex-col gap-4 ${className ?? ""}`}>
      <div className="flex justify-between items-center">
        <label className="form-label">{t("dateAndTime")}</label>

        {enableAllDayToggle && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={isAllDay}
                onChange={(e) => onToggleAllDay?.(e.target.checked)}
              />
              <div
                className={`w-10 h-6 rounded-full transition-colors ${isAllDay ? "bg-primary" : "bg-muted"}`}
              />
              <div
                className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isAllDay ? "transform translate-x-4" : ""}`}
              />
            </div>
            <span className="text-sm text-foreground-strong">
              {t("allDay")}
            </span>
          </label>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full">
        <div className="w-full sm:flex-1 sm:min-w-0">
          <span className="text-sm text-muted-foreground mb-1.5 block font-medium">
            {t("start")}
          </span>
          <DateButton
            label={t("start")}
            value={
              isAllDay
                ? startDisplay
                : `${startDisplay} ${formatTime(startDate)}`
            }
            isOpen={activeField === "start"}
            onClick={() =>
              setActiveField((prev) => (prev === "start" ? null : "start"))
            }
          />
        </div>

        <div className="w-full sm:flex-1 sm:min-w-0">
          <span className="text-sm text-muted-foreground mb-1.5 block font-medium">
            {t("end")}
          </span>
          <DateButton
            label={t("end")}
            value={
              isAllDay
                ? endDisplay
                : `${endDisplay} ${formatTime(endDate)}`
            }
            isOpen={activeField === "end"}
            onClick={() =>
              setActiveField((prev) => (prev === "end" ? null : "end"))
            }
          />
        </div>
      </div>

      {activeField && (
        <div className="rdp-form-wrapper border border-border rounded-card p-3 bg-background">
          <DayPicker
            id={`${idPrefix}-${activeField}`}
            mode="single"
            locale={dateFnsLocale}
            selected={activeField === "start" ? startDate : endDate}
            onSelect={
              activeField === "start"
                ? handleDaySelectStart
                : handleDaySelectEnd
            }
            disabled={
              activeField === "end"
                ? {
                    before:
                      minDateObj && minDateObj > startDate
                        ? minDateObj
                        : startDate,
                  }
                : minDateObj
                  ? { before: minDateObj }
                  : undefined
            }
            defaultMonth={activeField === "start" ? startDate : endDate}
            showOutsideDays
            fixedWeeks
            required={required}
          />
          {!isAllDay && (
            <div className="mt-3 pt-3 border-t border-border">
              <TimeSelector
                value={formatTime(
                  activeField === "start" ? startDate : endDate,
                )}
                onChange={
                  activeField === "start"
                    ? handleStartTimeChange
                    : handleEndTimeChange
                }
                minTime={
                  activeField === "end" &&
                    startDate.toDateString() === endDate.toDateString()
                    ? formatTime(startDate)
                    : undefined
                }
                label={activeField === "start" ? t("start") : t("end")}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
