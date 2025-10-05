import React, { useEffect, useState } from "react";
import DatePickerLib from "react-datepicker";
import ChevronLeftIcon from "@heroicons/react/solid/ChevronLeftIcon";
import ChevronRightIcon from "@heroicons/react/solid/ChevronRightIcon";
import format from "date-fns/format";
import setHours from "date-fns/setHours";
import setMinutes from "date-fns/setMinutes";
import ca from "date-fns/locale/ca";
import type { DatePickerProps } from "types/ui";
import type { CustomHeaderProps } from "types/props";
import { FormField } from "../FormField";
import { Text } from "../Text";
import { cn } from "@components/utils/cn";

import "react-datepicker/dist/react-datepicker.css";

const ButtonInput = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value?: string }
>(({ value, className, ...props }, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "p-component-xs.5 w-full rounded-xl border border-bColor text-blackCorp focus:border-darkCorp focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
        className,
      )}
      {...props}
    >
      <Text variant="body-sm">{value}</Text>
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

/**
 * A date and time picker component using react-datepicker with Catalan localization.
 * Provides start and end date/time selection with validation and custom styling.
 *
 * @param idPrefix - Prefix for generating unique IDs for the date inputs. Default: 'date'.
 * @param label - The label text displayed above the date picker.
 * @param subtitle - Optional subtitle text displayed below the label.
 * @param error - Error message to display when validation fails.
 * @param required - Indicates if the date selection is required.
 * @param helperText - Optional helper text displayed below the date picker.
 * @param startDate - Initial start date as ISO string or date-only string.
 * @param endDate - Initial end date as ISO string or date-only string.
 * @param minDate - Minimum selectable date as ISO string or date-only string.
 * @param onChange - Callback function called when dates change, receives field name and ISO string value.
 * @param className - Additional CSS classes to apply to the container.
 *
 * @example
 * // Basic date picker
 * <DatePicker
 *   label="Event Dates"
 *   onChange={(field, value) => console.log(field, value)}
 * />
 *
 * @example
 * // Date picker with initial values
 * <DatePicker
 *   label="Booking Period"
 *   startDate="2024-01-15T10:00"
 *   endDate="2024-01-15T12:00"
 *   onChange={(field, value) => handleDateChange(field, value)}
 *   required
 * />
 *
 * @example
 * // Date picker with minimum date and error
 * <DatePicker
 *   label="Future Event"
 *   minDate="2024-01-01"
 *   error="Please select a future date"
 *   helperText="Events must be scheduled at least 24 hours in advance"
 *   onChange={(field, value) => setDate(field, value)}
 * />
 */
export const DatePicker = ({
  idPrefix = "date",
  label,
  subtitle,
  error,
  required,
  helperText,
  startDate: initialStartDate,
  endDate: initialEndDate,
  minDate,
  onChange,
  className,
}: DatePickerProps) => {
  // Convert incoming strings to Date objects
  const startingDate = toDate(initialStartDate);
  const endingDate = initialEndDate
    ? toDate(initialEndDate)
    : setMinutes(startingDate, startingDate.getMinutes() + 60);
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
    <FormField
      id={`${idPrefix}-start`}
      label={label}
      subtitle={subtitle}
      error={error}
      required={required}
      helperText={helperText}
      className={className}
    >
      <div className="flex w-full flex-col gap-component-md md:flex-row">
        <div className="w-full">
          <label
            htmlFor={`${idPrefix}-start`}
            className="w-full font-bold text-blackCorp"
          >
            Inici *
          </label>
          <div className="mt-component-xs w-full">
            <DatePickerLib
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
              dateFormat="d MMMM, yyyy HH:mm aa"
              customInput={<ButtonInput />}
              renderCustomHeader={({
                date,
                decreaseMonth,
                increaseMonth,
                prevMonthButtonDisabled,
                nextMonthButtonDisabled,
              }: CustomHeaderProps) => (
                <div className="flex items-center justify-center p-component-xs">
                  <span className="w-1/2 uppercase text-blackCorp">
                    {format(date, "MMMM yyyy", { locale: ca })}
                  </span>
                  <div className="flex w-1/2 justify-evenly">
                    <button
                      onClick={decreaseMonth}
                      disabled={prevMonthButtonDisabled}
                      type="button"
                      className={cn(
                        "flex rounded-xl border border-darkCorp bg-whiteCorp p-component-xs text-blackCorp focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
                        prevMonthButtonDisabled &&
                          "cursor-not-allowed opacity-50",
                      )}
                    >
                      <ChevronLeftIcon className="h-5 w-5 text-blackCorp" />
                    </button>
                    <button
                      onClick={increaseMonth}
                      disabled={nextMonthButtonDisabled}
                      type="button"
                      className={cn(
                        "flex rounded-xl border border-darkCorp bg-whiteCorp p-component-xs text-blackCorp focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
                        nextMonthButtonDisabled &&
                          "cursor-not-allowed opacity-50",
                      )}
                    >
                      <ChevronRightIcon className="h-5 w-5 text-blackCorp" />
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
            className="w-full font-bold text-blackCorp"
          >
            Final *
          </label>
          <div className="mt-component-xs w-full">
            <DatePickerLib
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
                <div className="flex items-center justify-center p-component-xs">
                  <span className="w-1/2 uppercase text-blackCorp">
                    {format(date, "MMMM yyyy", { locale: ca })}
                  </span>
                  <div className="flex w-1/2 justify-evenly">
                    <button
                      onClick={decreaseMonth}
                      disabled={prevMonthButtonDisabled}
                      type="button"
                      className={cn(
                        "flex rounded-xl border border-darkCorp bg-whiteCorp p-component-xs text-blackCorp focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
                        prevMonthButtonDisabled &&
                          "cursor-not-allowed opacity-50",
                      )}
                    >
                      <ChevronLeftIcon className="h-5 w-5 text-blackCorp" />
                    </button>
                    <button
                      onClick={increaseMonth}
                      disabled={nextMonthButtonDisabled}
                      type="button"
                      className={cn(
                        "flex rounded-xl border border-darkCorp bg-whiteCorp p-component-xs text-blackCorp focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
                        nextMonthButtonDisabled &&
                          "cursor-not-allowed opacity-50",
                      )}
                    >
                      <ChevronRightIcon className="h-5 w-5 text-blackCorp" />
                    </button>
                  </div>
                </div>
              )}
            />
          </div>
        </div>
      </div>
    </FormField>
  );
};

DatePicker.displayName = "DatePicker";
