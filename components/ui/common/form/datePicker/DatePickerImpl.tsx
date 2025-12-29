"use client";

import React, { useMemo } from "react";
import DatePicker from "react-datepicker";
import ChevronLeftIcon from "@heroicons/react/solid/esm/ChevronLeftIcon";
import ChevronRightIcon from "@heroicons/react/solid/esm/ChevronRightIcon";
import CalendarIcon from "@heroicons/react/outline/esm/CalendarIcon";
import { format, setHours, setMinutes, setSeconds, addMinutes } from "date-fns";
import { ca } from "date-fns/locale";
import { useTranslations } from "next-intl";
import { DatePickerComponentProps, CustomHeaderProps } from "types/props";

import "react-datepicker/dist/react-datepicker.css";

const ButtonInput = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value?: string }
>(({ value, ...props }, ref) => {
  const { className: _className, ...restProps } = props;
  return (
    <button
      ref={ref}
      type="button"
      className="w-full min-h-[44px] px-4 py-3 border border-border rounded-xl text-foreground-strong text-base bg-background hover:border-primary/50 hover:bg-muted/30 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all flex items-center justify-between gap-2"
      {...restProps}
    >
      <span>{value}</span>
      <CalendarIcon className="w-5 h-5 text-foreground/50 flex-shrink-0" />
    </button>
  );
});

ButtonInput.displayName = "ButtonInput";

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
  isAllDay: boolean
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

function buildHeaderRenderer(monthYearFormat: string) {
  return function renderCustomHeader({
    date,
    decreaseMonth,
    increaseMonth,
    prevMonthButtonDisabled,
    nextMonthButtonDisabled,
  }: CustomHeaderProps) {
    return (
      <div className="flex justify-between items-center p-2">
        <button
          onClick={decreaseMonth}
          disabled={prevMonthButtonDisabled}
          type="button"
          className="p-1"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        <span className="font-bold capitalize">
          {format(date, monthYearFormat, { locale: ca })}
        </span>
        <button
          onClick={increaseMonth}
          disabled={nextMonthButtonDisabled}
          type="button"
          className="p-1"
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>
    );
  };
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
  const dateFormat = t("dateFormat");
  const monthYearFormat = t("monthYearFormat");

  const startDate = useMemo(() => toDate(initialStartDate), [initialStartDate]);
  const endDate = useMemo(
    () => computeEndDate(startDate, initialEndDate, isAllDay),
    [startDate, initialEndDate, isAllDay]
  );
  const minDateObj = useMemo(() => (minDate ? toDate(minDate) : undefined), [minDate]);

  const renderCustomHeader = useMemo(
    () => buildHeaderRenderer(monthYearFormat),
    [monthYearFormat]
  );

  const onChangeStart = (date: Date) => {
    onChange("startDate", toISOStringLocalMinutes(date));

    if (isAllDay) {
      const endOfDay = setSeconds(setMinutes(setHours(date, 23), 59), 59);
      onChange("endDate", toISOStringLocalMinutes(endOfDay));
      return;
    }

    const diff = endDate.getTime() - startDate.getTime();
    const newEnd = diff > 0 ? new Date(date.getTime() + diff) : addMinutes(date, 60);
    onChange("endDate", toISOStringLocalMinutes(newEnd));
  };

  const onChangeEnd = (date: Date) => {
    const corrected = date < startDate ? addMinutes(startDate, 15) : date;
    onChange("endDate", toISOStringLocalMinutes(corrected));
  };

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
                className={`w-10 h-6 rounded-full transition-colors ${isAllDay ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"}`}
              ></div>
              <div
                className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isAllDay ? "transform translate-x-4" : ""}`}
              ></div>
            </div>
            <span className="text-sm text-foreground-strong">{t("allDay")}</span>
          </label>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full">
        <div className="w-full sm:flex-1 sm:min-w-0">
          <span className="text-sm text-foreground/70 mb-1.5 block font-medium">
            {t("start")}
          </span>
          <DatePicker
            id={`${idPrefix}-start`}
            locale={ca}
            selected={startDate}
            onChange={onChangeStart}
            showTimeSelect={!isAllDay}
            dateFormat={isAllDay ? "dd/MM/yyyy" : dateFormat}
            selectsStart
            startDate={startDate}
            endDate={endDate}
            minDate={minDateObj}
            required={required}
            customInput={<ButtonInput />}
            popperClassName="react-datepicker-left"
            popperPlacement="bottom-start"
            renderCustomHeader={renderCustomHeader}
          />
        </div>

        <div className="w-full sm:flex-1 sm:min-w-0">
          <span className="text-sm text-foreground/70 mb-1.5 block font-medium">
            {t("end")}
          </span>
          <DatePicker
            id={`${idPrefix}-end`}
            locale={ca}
            selected={endDate}
            onChange={onChangeEnd}
            showTimeSelect={!isAllDay}
            dateFormat={isAllDay ? "dd/MM/yyyy" : dateFormat}
            selectsEnd
            startDate={startDate}
            endDate={endDate}
            minDate={startDate}
            minTime={
              startDate.toDateString() === endDate.toDateString() ? startDate : undefined
            }
            maxTime={
              startDate.toDateString() === endDate.toDateString()
                ? setSeconds(setMinutes(setHours(endDate, 23), 59), 59)
                : undefined
            }
            required={required}
            customInput={<ButtonInput />}
            popperClassName="react-datepicker-left"
            popperPlacement="bottom-start"
            renderCustomHeader={renderCustomHeader}
          />
        </div>
      </div>
    </div>
  );
}
