import React from "react";
import DatePicker from "react-datepicker";
import ChevronLeftIcon from "@heroicons/react/solid/ChevronLeftIcon";
import ChevronRightIcon from "@heroicons/react/solid/ChevronRightIcon";
import format from "date-fns/format";
import setHours from "date-fns/setHours";
import setMinutes from "date-fns/setMinutes";
import setSeconds from "date-fns/setSeconds";
import ca from "date-fns/locale/ca";
import { DatePickerComponentProps, CustomHeaderProps } from "types/props";
import { useTranslations } from "next-intl";

import "react-datepicker/dist/react-datepicker.css";

const ButtonInput = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value?: string }
>(({ value, ...props }, ref) => {
  // Extract className from props to prevent it from overriding our styling
  const { className: _className, ...restProps } = props;

  return (
    <button
      ref={ref}
      type="button"
      className="w-full p-2.5 border border-border rounded-xl text-foreground-strong text-base focus:border-foreground-strong focus:outline-none"
      {...restProps}
    >
      {value}
    </button>
  );
});

ButtonInput.displayName = "ButtonInput";

// --- Conversion helpers ---
function toDate(dateStr: string): Date {
  // Accepts YYYY-MM-DD or ISO string
  if (!dateStr) return setHours(setMinutes(new Date(), 0), 9);
  // If only date, add time 09:00
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(`${dateStr}T09:00`);
  }
  return new Date(dateStr);
}
function toISOString(date: Date): string {
  // Returns YYYY-MM-DDTHH:mm
  return date.toISOString().slice(0, 16);
}
// Removed unused toDateString function

export default function DatePickerComponent({
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
  // Convert incoming strings to Date objects
  const startingDate = toDate(initialStartDate);
  const initialEndCandidate = initialEndDate
    ? toDate(initialEndDate)
    : setMinutes(startingDate, startingDate.getMinutes() + 60);
  const endingDate =
    initialEndCandidate > startingDate
      ? initialEndCandidate
      : new Date(startingDate.getTime() + 60 * 60 * 1000);
  const minDateObj = minDate ? toDate(minDate) : undefined;
  const baseEnd = endingDate > startingDate ? endingDate : startingDate;
  const startDate = startingDate;
  const endDate = isAllDay
    ? setSeconds(setMinutes(setHours(startDate, 23), 59), 59)
    : baseEnd;

  // Emit string values on change
  const onChangeStart = (date: Date) => {
    if (isAllDay) {
      const endOfDay = setSeconds(setMinutes(setHours(date, 23), 59), 59);
      onChange("endDate", toISOString(endOfDay));
    } else if (date > endDate) {
      const corrected = new Date(date.getTime() + 60 * 60 * 1000);
      onChange("endDate", toISOString(corrected));
    }
    onChange("startDate", toISOString(date));
  };
  const onChangeEnd = (date: Date) => {
    if (isAllDay) {
      const endOfDay = setSeconds(setMinutes(setHours(startDate, 23), 59), 59);
      onChange("endDate", toISOString(endOfDay));
      return;
    }
    const corrected =
      date < startDate
        ? new Date(startDate.getTime() + 60 * 60 * 1000)
        : date;
    onChange("endDate", toISOString(corrected));
  };

  return (
    <div
      className={`flex flex-col md:flex-row gap-4 w-full ${className ?? ""}`}
    >
      {enableAllDayToggle ? (
        <label
          htmlFor={`${idPrefix}-all-day`}
          className="flex items-center gap-2 w-full md:w-auto cursor-pointer px-3 py-2 border border-border rounded-input hover:border-foreground/60 focus-within:border-foreground-strong"
          aria-pressed={isAllDay}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onToggleAllDay?.(!isAllDay);
            }
          }}
        >
          <input
            id={`${idPrefix}-all-day`}
            type="checkbox"
            checked={isAllDay}
            onChange={(event) => onToggleAllDay?.(event.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          <span className="text-foreground-strong text-sm">{t("allDay")}</span>
        </label>
      ) : null}
      <div className="w-full">
        <label
          htmlFor={`${idPrefix}-start`}
          className="w-full text-foreground-strong font-bold"
        >
          {t("start")}
        </label>
        <div className="w-full mt-2">
          <DatePicker
            id={`${idPrefix}-start`}
            locale={ca}
            selected={startDate}
            onChange={onChangeStart}
            showTimeSelect
            selectsStart
            startDate={startDate}
            endDate={endDate}
            minDate={minDateObj}
            required={required}
            nextMonthButtonLabel=">"
            previousMonthButtonLabel="<"
            popperClassName="react-datepicker-left"
            popperPlacement="top-end"
            dateFormat={dateFormat}
            customInput={<ButtonInput />}
            renderCustomHeader={({
              date,
              decreaseMonth,
              increaseMonth,
              prevMonthButtonDisabled,
              nextMonthButtonDisabled,
            }: CustomHeaderProps) => (
              <div className="flex justify-center items-center p-2">
                <span className="w-1/2 text-foreground-strong uppercase">
                  {format(date, monthYearFormat, { locale: ca })}
                </span>
                <div className="w-1/2 flex justify-evenly">
                  <button
                    onClick={decreaseMonth}
                    disabled={prevMonthButtonDisabled}
                    type="button"
                    className={`${prevMonthButtonDisabled
                        ? " cursor-not-allowed opacity-50"
                        : ""
                      }flex p-1 text-foreground-strong bg-background border border-foreground-strong rounded-xl focus:outline-none`}
                  >
                    <ChevronLeftIcon className="w-5 h-5 text-foreground-strong" />
                  </button>
                  <button
                    onClick={increaseMonth}
                    disabled={nextMonthButtonDisabled}
                    type="button"
                    className={`${nextMonthButtonDisabled
                        ? " cursor-not-allowed opacity-50"
                        : ""
                      }flex p-1 text-foreground-strong bg-background border border-foreground-strong rounded-xl focus:outline-none`}
                  >
                    <ChevronRightIcon className="w-5 h-5 text-foreground-strong" />
                  </button>
                </div>
              </div>
            )}
          />
        </div>
      </div>
      {isAllDay ? (
        <div className="w-full text-foreground/80 text-sm">
          {t("allDayHelper")}
        </div>
      ) : (
        <div className="w-full">
          <label
            htmlFor={`${idPrefix}-end`}
            className="w-full text-foreground-strong font-bold"
          >
            {t("end")}
          </label>
          <div className="w-full mt-2">
            <DatePicker
              id={`${idPrefix}-end`}
              locale={ca}
              selected={endDate}
              onChange={onChangeEnd}
              showTimeSelect
              selectsEnd
              startDate={startDate}
              endDate={endDate}
              minDate={startDate}
              minTime={
                startDate.toDateString() === endDate.toDateString()
                  ? startDate
                  : undefined
              }
              maxTime={
                startDate.toDateString() === endDate.toDateString()
                  ? setSeconds(setMinutes(setHours(endDate, 23), 59), 59)
                  : undefined
              }
              required={required}
              nextMonthButtonLabel=">"
              previousMonthButtonLabel="<"
              popperClassName="react-datepicker-left"
              popperPlacement="top-end"
              dateFormat={dateFormat}
              customInput={<ButtonInput />}
              renderCustomHeader={({
                date,
                decreaseMonth,
                increaseMonth,
                prevMonthButtonDisabled,
                nextMonthButtonDisabled,
              }: CustomHeaderProps) => (
                <div className="flex justify-center items-center p-2">
                  <span className="w-1/2 text-foreground-strong uppercase">
                    {format(date, monthYearFormat, { locale: ca })}
                  </span>
                  <div className="w-1/2 flex justify-evenly">
                    <button
                      onClick={decreaseMonth}
                      disabled={prevMonthButtonDisabled}
                      type="button"
                      className={`${prevMonthButtonDisabled
                          ? " cursor-not-allowed opacity-50"
                          : ""
                        }flex p-1 text-foreground-strong bg-background border border-foreground-strong rounded-xl focus:outline-none`}
                    >
                      <ChevronLeftIcon className="w-5 h-5 text-foreground-strong" />
                    </button>
                    <button
                      onClick={increaseMonth}
                      disabled={nextMonthButtonDisabled}
                      type="button"
                      className={`${nextMonthButtonDisabled
                          ? " cursor-not-allowed opacity-50"
                          : ""
                        }flex p-1 text-foreground-strong bg-background border border-foreground-strong rounded-xl focus:outline-none`}
                    >
                      <ChevronRightIcon className="w-5 h-5 text-foreground-strong" />
                    </button>
                  </div>
                </div>
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
}
