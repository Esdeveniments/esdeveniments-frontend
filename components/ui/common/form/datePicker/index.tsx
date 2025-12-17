import React from "react";
import DatePicker from "react-datepicker";
import ChevronLeftIcon from "@heroicons/react/solid/ChevronLeftIcon";
import ChevronRightIcon from "@heroicons/react/solid/ChevronRightIcon";
import CalendarIcon from "@heroicons/react/outline/CalendarIcon";
import format from "date-fns/format";
import setHours from "date-fns/setHours";
import setMinutes from "date-fns/setMinutes";
import setSeconds from "date-fns/setSeconds";
import addMinutes from "date-fns/addMinutes";
import ca from "date-fns/locale/ca";
import { DatePickerComponentProps, CustomHeaderProps } from "types/props";
import { useTranslations } from "next-intl";

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
function toISOString(date: Date): string {
  return date.toISOString().slice(0, 16);
}

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

  const startingDate = toDate(initialStartDate);
  const initialEndCandidate = initialEndDate
    ? toDate(initialEndDate)
    : setMinutes(startingDate, startingDate.getMinutes() + 60);
  const endingDate =
    initialEndCandidate > startingDate
      ? initialEndCandidate
      : new Date(startingDate.getTime() + 60 * 60 * 1000);

  const minDateObj = minDate ? toDate(minDate) : undefined;
  // Ensure valid base values for pickers
  const startDate = startingDate;
  // If all day, end date is logical end of day for logic, but UI might hide it or show it disabled
  // Actually standard pattern for All Day is showing the date but hiding time, or just Start/End Dates without time.
  // Implementation note: Current All Day logic sets End Date to 23:59:59.
  const endDate = isAllDay
    ? setSeconds(setMinutes(setHours(startDate, 23), 59), 59)
    : endingDate;

  // Smart Sync Logic
  const onChangeStart = (date: Date) => {
    // If start date moves past end date, push end date to keep same duration or at least +1h
    // Current requirement: "Smart Default: End date defaults to same day". 
    // Let's ensure End Date is at least Start Date + 1h

    // Convert to ISO
    onChange("startDate", toISOString(date));

    // If All Day is ON, we just update start date. Logic elsewhere handles the 23:59.
    // If All Day is OFF, we update End Date if needed.
    if (!isAllDay) {
      // If the new start date makes the current end date invalid (start > end), or if we want to be smart/helpful:
      // Standard UX: If I change Start from 10am to 2pm, and End was 11am, End should likely move to 3pm (keep duration) OR just ensure min difference.
      // User requested: "Smart default... End Date automatically defaults to same day". 
      // Let's basically ensure End Date is >= Start + Duration, or simpler: push End to Start + 1h if it was behind.
      const diff = endingDate.getTime() - startingDate.getTime();
      const newEnd = diff > 0 ? new Date(date.getTime() + diff) : addMinutes(date, 60);
      onChange("endDate", toISOString(newEnd));
    } else {
      // For All Day, sync end date to end of *this* new day
      const endOfDay = setSeconds(setMinutes(setHours(date, 23), 59), 59);
      onChange("endDate", toISOString(endOfDay));
    }
  };

  const onChangeEnd = (date: Date) => {
    // Standard validation
    const corrected = date < startDate ? addMinutes(startDate, 15) : date;
    onChange("endDate", toISOString(corrected));
  };

  return (
    <div className={`w-full flex flex-col gap-4 ${className ?? ""}`}>
      {/* Header Row: Label + All Day Toggle */}
      <div className="flex justify-between items-center">
        <label className="form-label">
          {t("dateAndTime")}
        </label>

        {enableAllDayToggle && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={isAllDay}
                onChange={(e) => onToggleAllDay?.(e.target.checked)}
              />
              <div className={`w-10 h-6 rounded-full transition-colors ${isAllDay ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
              <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isAllDay ? 'transform translate-x-4' : ''}`}></div>
            </div>
            <span className="text-sm text-foreground-strong">{t("allDay")}</span>
          </label>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 w-full">
        {/* Start Date */}
        <div className="w-full">
          <span className="text-sm text-foreground/70 mb-1.5 block font-medium">{t("start")}</span>
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
            renderCustomHeader={({
              date,
              decreaseMonth,
              increaseMonth,
              prevMonthButtonDisabled,
              nextMonthButtonDisabled,
            }: CustomHeaderProps) => (
              <div className="flex justify-between items-center p-2">
                <button onClick={decreaseMonth} disabled={prevMonthButtonDisabled} type="button" className="p-1"><ChevronLeftIcon className="w-5 h-5" /></button>
                <span className="font-bold capitalize">{format(date, monthYearFormat, { locale: ca })}</span>
                <button onClick={increaseMonth} disabled={nextMonthButtonDisabled} type="button" className="p-1"><ChevronRightIcon className="w-5 h-5" /></button>
              </div>
            )}
          />
        </div>

        {/* End Date - Hidden if All Day? Usually calendars hide end time if single day all-day. But for multi-day all-day... 
           Simplicity: If All Day, usually Start Date implies the day. If we want ranges, we show End Date. 
           Let's show End Date input but only Date if All Day is checked. */}
        <div className="w-full">
          <span className="text-sm text-foreground/70 mb-1.5 block font-medium">{t("end")}</span>
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
            required={required}
            customInput={<ButtonInput />}
            popperClassName="react-datepicker-left"
            popperPlacement="bottom-start"
            renderCustomHeader={({
              date,
              decreaseMonth,
              increaseMonth,
              prevMonthButtonDisabled,
              nextMonthButtonDisabled,
            }: CustomHeaderProps) => (
              <div className="flex justify-between items-center p-2">
                <button onClick={decreaseMonth} disabled={prevMonthButtonDisabled} type="button" className="p-1"><ChevronLeftIcon className="w-5 h-5" /></button>
                <span className="font-bold capitalize">{format(date, monthYearFormat, { locale: ca })}</span>
                <button onClick={increaseMonth} disabled={nextMonthButtonDisabled} type="button" className="p-1"><ChevronRightIcon className="w-5 h-5" /></button>
              </div>
            )}
          />
        </div>
      </div>
    </div>
  );
}
