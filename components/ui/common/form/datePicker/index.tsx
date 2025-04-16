import { forwardRef, useEffect, useState, ForwardRefRenderFunction } from "react";
import DatePicker from "react-datepicker";
import ChevronLeftIcon from "@heroicons/react/solid/ChevronLeftIcon";
import ChevronRightIcon from "@heroicons/react/solid/ChevronRightIcon";
import format from "date-fns/format";
import ca from "date-fns/locale/ca";
import setHours from "date-fns/setHours";
import setMinutes from "date-fns/setMinutes";

import "react-datepicker/dist/react-datepicker.css";

interface DatePickerComponentProps {
  startDate?: Date;
  endDate?: Date;
  onChange: (field: "startDate" | "endDate", date: Date) => void;
}

interface DateComponentProps {
  selected: Date;
  startDate: Date;
  endDate: Date;
  onChange: (date: Date) => void;
  selectsStart?: boolean;
  selectsEnd?: boolean;
  minDate?: Date;
  className?: string;
}

interface ButtonInputProps {
  value?: string;
  onClick?: () => void;
}

interface CustomHeaderProps {
  date: Date;
  decreaseMonth: () => void;
  increaseMonth: () => void;
  prevMonthButtonDisabled: boolean;
  nextMonthButtonDisabled: boolean;
}

export default function DatePickerComponent({
  startDate: initialStartDate,
  endDate: initialEndDate,
  onChange,
}: DatePickerComponentProps) {
  const parsedStartDate = initialStartDate instanceof Date ? initialStartDate : initialStartDate ? new Date(initialStartDate) : null;
  const parsedEndDate = initialEndDate instanceof Date ? initialEndDate : initialEndDate ? new Date(initialEndDate) : null;

  const startingDate = parsedStartDate && !isNaN(parsedStartDate.getTime())
    ? parsedStartDate
    : setHours(setMinutes(new Date(), 0), 9);
  const endingDate = parsedEndDate && !isNaN(parsedEndDate.getTime())
    ? parsedEndDate
    : setMinutes(new Date(startingDate), 60);

  const [startDate, setStartDate] = useState<Date>(startingDate);
  const [endDate, setEndDate] = useState<Date>(endingDate);

  useEffect(() => {
    if (startDate > endDate) setEndDate(setMinutes(startDate, 60));
  }, [startDate, endDate]);

  const onChangeStart = (date: Date) => {
    onChange("startDate", date);
    setStartDate(date);
    setEndDate(new Date(date.getTime() + 60 * 60 * 1000));
  };

  const onChangeEnd = (date: Date) => {
    onChange("endDate", date);
    setEndDate(date);
  };

  return (
    <>
      <div className="w-full">
        <label htmlFor="start-date" className="w-full text-blackCorp font-bold">
          Inici *
        </label>
        <div className="w-full mt-2">
          <DateComponent
            selected={startDate}
            onChange={onChangeStart}
            selectsStart
            startDate={startDate}
            endDate={endDate}
            className="w-full rounded-xl border-bColor focus:border-darkCorp"
          />
        </div>
      </div>
      <div className="w-full">
        <label htmlFor="end-date" className="w-full text-blackCorp font-bold">
          Final *
        </label>
        <div className="w-full mt-2">
          <DateComponent
            selected={endDate}
            onChange={onChangeEnd}
            selectsEnd
            startDate={startDate}
            endDate={endDate}
            minDate={startDate}
            className="w-full rounded-xl border-bColor focus:border-darkCorp"
          />
        </div>
      </div>
    </>
  );
}

const DateComponent = ({
  selected,
  startDate,
  endDate,
  onChange,
  selectsStart,
  selectsEnd,
  minDate,
}: DateComponentProps) => {
  return (
    <DatePicker
      locale={ca}
      selected={selected}
      onChange={onChange}
      showTimeSelect
      selectsStart={!!selectsStart}
      selectsEnd={!!selectsEnd}
      startDate={startDate}
      endDate={endDate}
      minDate={minDate}
      nextMonthButtonLabel=">"
      previousMonthButtonLabel="<"
      popperClassName="react-datepicker-left"
      popperPlacement="top-end"
      dateFormat="d MMMM, yyyy HH:mm aa"
      customInput={<ButtonInputWithRef />}
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
                prevMonthButtonDisabled && "cursor-not-allowed opacity-50"
              }flex p-1 text-blackCorp bg-whiteCorp border border-darkCorp rounded-xl focus:outline-none`}
            >
              <ChevronLeftIcon className="w-5 h-5 text-blackCorp" />
            </button>

            <button
              onClick={increaseMonth}
              disabled={nextMonthButtonDisabled}
              type="button"
              className={`${
                nextMonthButtonDisabled && "cursor-not-allowed opacity-50"
              }flex p-1 text-blackCorp bg-whiteCorp border border-darkCorp rounded-xl focus:outline-none`}
            >
              <ChevronRightIcon className="w-5 h-5 text-blackCorp" />
            </button>
          </div>
        </div>
      )}
    />
  );
};

const ButtonInput: ForwardRefRenderFunction<HTMLButtonElement, ButtonInputProps> = (
  { value, onClick },
  ref
) => {
  return (
    <button
      onClick={onClick}
      ref={ref}
      type="button"
      className="w-full p-2.5 border border-bColor rounded-xl text-blackCorp
      sm:text-sm"
    >
      {value}
    </button>
  );
};

const ButtonInputWithRef = forwardRef(ButtonInput);
ButtonInputWithRef.displayName = "ButtonInput";
