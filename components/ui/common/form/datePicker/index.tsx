import React, { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import ChevronLeftIcon from "@heroicons/react/solid/ChevronLeftIcon";
import ChevronRightIcon from "@heroicons/react/solid/ChevronRightIcon";
import format from "date-fns/format";
import ca from "date-fns/locale/ca";
import setHours from "date-fns/setHours";
import setMinutes from "date-fns/setMinutes";

import "react-datepicker/dist/react-datepicker.css";

// Improved typing: only expose what is needed, and forward accessibility props
export interface DatePickerComponentProps {
  idPrefix?: string;
  startDate: Date;
  endDate: Date;
  minDate?: Date;
  onChange: (field: "startDate" | "endDate", date: Date) => void;
  required?: boolean;
  className?: string;
}

interface CustomHeaderProps {
  date: Date;
  decreaseMonth: () => void;
  increaseMonth: () => void;
  prevMonthButtonDisabled: boolean;
  nextMonthButtonDisabled: boolean;
}

const ButtonInput = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value?: string }
>(({ value, ...props }, ref) => (
  <button ref={ref} type="button" {...props}>
    {value}
  </button>
));

ButtonInput.displayName = "ButtonInput";

export default function DatePickerComponent({
  idPrefix = "date",
  startDate: initialStartDate,
  endDate: initialEndDate,
  minDate,
  onChange,
  required,
  className,
}: DatePickerComponentProps) {
  // Ensure valid dates
  const startingDate =
    initialStartDate instanceof Date && !isNaN(initialStartDate.getTime())
      ? initialStartDate
      : setHours(setMinutes(new Date(), 0), 9);
  const endingDate =
    initialEndDate instanceof Date && !isNaN(initialEndDate.getTime())
      ? initialEndDate
      : setMinutes(new Date(startingDate), 60);

  const [startDate, setStartDate] = useState<Date>(startingDate);
  const [endDate, setEndDate] = useState<Date>(endingDate);

  useEffect(() => {
    if (startDate > endDate) setEndDate(setMinutes(startDate, 60));
  }, [startDate, endDate]);

  const onChangeStart = (date: Date) => {
    onChange("startDate", date);
    setStartDate(date);
    if (date > endDate) setEndDate(new Date(date.getTime() + 60 * 60 * 1000));
  };

  const onChangeEnd = (date: Date) => {
    onChange("endDate", date);
    setEndDate(date);
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
            minDate={minDate}
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
