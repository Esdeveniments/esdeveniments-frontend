import React, { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import ChevronLeftIcon from "@heroicons/react/solid/ChevronLeftIcon";
import ChevronRightIcon from "@heroicons/react/solid/ChevronRightIcon";
import format from "date-fns/format";
import ca from "date-fns/locale/ca";
import { DatePickerComponentProps, CustomHeaderProps } from "types/props";

import "react-datepicker/dist/react-datepicker.css";

const ButtonInput = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value?: string }
>(({ value, ...props }, ref) => (
  <button ref={ref} type="button" {...props}>
    {value}
  </button>
));

ButtonInput.displayName = "ButtonInput";

// --- Conversion helpers ---
function toDate(dateStr: string): Date {
  // Accepts YYYY-MM-DD or ISO string
  if (!dateStr) return new Date();
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
}: DatePickerComponentProps) {
  // Convert incoming strings to Date objects
  const startingDate = toDate(initialStartDate);
  const endingDate = toDate(initialEndDate);
  const minDateObj = minDate ? toDate(minDate) : undefined;

  const [startDate, setStartDate] = useState<Date>(startingDate);
  const [endDate, setEndDate] = useState<Date>(endingDate);

  useEffect(() => {
    if (startDate > endDate)
      setEndDate(new Date(startDate.getTime() + 60 * 60 * 1000));
  }, [startDate, endDate]);

  // Emit string values on change
  const onChangeStart = (date: Date) => {
    setStartDate(date);
    if (date > endDate) setEndDate(new Date(date.getTime() + 60 * 60 * 1000));
    onChange("startDate", toISOString(date));
  };
  const onChangeEnd = (date: Date) => {
    setEndDate(date);
    onChange("endDate", toISOString(date));
  };

  return (
    <div
      className={`flex flex-col md:flex-row gap-4 w-full ${className ?? ""}`}
    >
      <div className="w-full">
        <label
          htmlFor={`${idPrefix}-start`}
          className="w-full text-blackCorp font-bold"
        >
          Inici *
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
            className="w-full rounded-xl border-bColor focus:border-darkCorp"
            nextMonthButtonLabel=">"
            previousMonthButtonLabel="<"
            popperClassName="react-datepicker-left"
            popperPlacement="top-end"
            dateFormat="d MMMM, yyyy HH:mm aa"
            customInput={<ButtonInput />}
            renderCustomHeader={({
              date,
              decreaseMonth,
              increaseMonth,
              prevMonthButtonDisabled,
              nextMonthButtonDisabled,
            }: CustomHeaderProps) => (
              <div className="flex justify-center items-center p-2">
                <span className="w-1/2 text-blackCorp uppercase">
                  {format(date, "MMMM yyyy", { locale: ca })}
                </span>
                <div className="w-1/2 flex justify-evenly">
                  <button
                    onClick={decreaseMonth}
                    disabled={prevMonthButtonDisabled}
                    type="button"
                    className={`${
                      prevMonthButtonDisabled
                        ? " cursor-not-allowed opacity-50"
                        : ""
                    }flex p-1 text-blackCorp bg-whiteCorp border border-darkCorp rounded-xl focus:outline-none`}
                  >
                    <ChevronLeftIcon className="w-5 h-5 text-blackCorp" />
                  </button>
                  <button
                    onClick={increaseMonth}
                    disabled={nextMonthButtonDisabled}
                    type="button"
                    className={`${
                      nextMonthButtonDisabled
                        ? " cursor-not-allowed opacity-50"
                        : ""
                    }flex p-1 text-blackCorp bg-whiteCorp border border-darkCorp rounded-xl focus:outline-none`}
                  >
                    <ChevronRightIcon className="w-5 h-5 text-blackCorp" />
                  </button>
                </div>
              </div>
            )}
          />
        </div>
      </div>
      <div className="w-full">
        <label
          htmlFor={`${idPrefix}-end`}
          className="w-full text-blackCorp font-bold"
        >
          Final *
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
            required={required}
            className="w-full rounded-xl border-bColor focus:border-darkCorp"
            nextMonthButtonLabel=">"
            previousMonthButtonLabel="<"
            popperClassName="react-datepicker-left"
            popperPlacement="top-end"
            dateFormat="d MMMM, yyyy HH:mm aa"
            customInput={<ButtonInput />}
            renderCustomHeader={({
              date,
              decreaseMonth,
              increaseMonth,
              prevMonthButtonDisabled,
              nextMonthButtonDisabled,
            }: CustomHeaderProps) => (
              <div className="flex justify-center items-center p-2">
                <span className="w-1/2 text-blackCorp uppercase">
                  {format(date, "MMMM yyyy", { locale: ca })}
                </span>
                <div className="w-1/2 flex justify-evenly">
                  <button
                    onClick={decreaseMonth}
                    disabled={prevMonthButtonDisabled}
                    type="button"
                    className={`${
                      prevMonthButtonDisabled
                        ? " cursor-not-allowed opacity-50"
                        : ""
                    }flex p-1 text-blackCorp bg-whiteCorp border border-darkCorp rounded-xl focus:outline-none`}
                  >
                    <ChevronLeftIcon className="w-5 h-5 text-blackCorp" />
                  </button>
                  <button
                    onClick={increaseMonth}
                    disabled={nextMonthButtonDisabled}
                    type="button"
                    className={`${
                      nextMonthButtonDisabled
                        ? " cursor-not-allowed opacity-50"
                        : ""
                    }flex p-1 text-blackCorp bg-whiteCorp border border-darkCorp rounded-xl focus:outline-none`}
                  >
                    <ChevronRightIcon className="w-5 h-5 text-blackCorp" />
                  </button>
                </div>
              </div>
            )}
          />
        </div>
      </div>
    </div>
  );
}
