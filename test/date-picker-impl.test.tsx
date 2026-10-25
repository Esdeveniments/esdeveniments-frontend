/**
 * Tests for DatePickerImpl (publish form): one inline range calendar plus
 * start/end time inputs. Covers range selection, the all-day toggle, time
 * auto-adjustment and the regression where an earlier start became unselectable.
 */
import { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import DatePickerImpl from "../components/ui/common/form/datePicker/DatePickerImpl";
import type { DatePickerComponentProps } from "types/props";

// Mock react-day-picker CSS import
vi.mock("react-day-picker/style.css", () => ({}));

/**
 * Mirrors toLocalDateTimeString (utils/date-helpers): creates a local Date
 * with the given hours/minutes and formats as local ISO (no UTC shift).
 * Uses numeric Date constructor to avoid UTC parsing of date-only strings.
 */
function expectedLocalTime(
  dateStr: string,
  hours: number,
  minutes: number,
): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day, hours, minutes, 0, 0);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${dd}T${h}:${mi}`;
}

const dayButton = (ymd: string) =>
  document.querySelector<HTMLButtonElement>(`[data-day="${ymd}"] button`)!;

/** Holds the form values like EventForm does, so taps build on each other. */
function Harness(
  props: Omit<DatePickerComponentProps, "onChange"> & {
    onChange: DatePickerComponentProps["onChange"];
  },
) {
  const [dates, setDates] = useState({
    startDate: props.startDate,
    endDate: props.endDate,
  });
  return (
    <DatePickerImpl
      {...props}
      startDate={dates.startDate}
      endDate={dates.endDate}
      onChange={(field, value) => {
        setDates((prev) => ({ ...prev, [field]: value }));
        props.onChange(field, value);
      }}
    />
  );
}

describe("DatePickerImpl", () => {
  const baseProps = {
    startDate: "2026-03-07T10:00",
    endDate: "2026-03-07T11:00",
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial rendering", () => {
    it("renders the label, an inline calendar and both time inputs", () => {
      render(<DatePickerImpl {...baseProps} />);

      expect(screen.getByText("Data i hora *")).toBeInTheDocument();
      expect(screen.getByRole("grid")).toBeInTheDocument();
      expect(screen.getByLabelText("Hora d'inici")).toHaveValue("10:00");
      expect(screen.getByLabelText("Hora de fi")).toHaveValue("11:00");
    });

    it("does not render all-day toggle by default", () => {
      render(<DatePickerImpl {...baseProps} />);
      expect(
        screen.queryByText("Tot el dia (sense hora de fi)")
      ).not.toBeInTheDocument();
    });

    it("handles date-only startDate format (YYYY-MM-DD) as 09:00", () => {
      render(<DatePickerImpl {...baseProps} startDate="2026-03-07" endDate="" />);
      expect(screen.getByLabelText("Hora d'inici")).toHaveValue("09:00");
      expect(screen.getByLabelText("Hora de fi")).toHaveValue("10:00");
    });
  });

  describe("range selection", () => {
    it("first tap makes a one-day event and keeps both times", () => {
      render(<Harness {...baseProps} />);

      fireEvent.click(dayButton("2026-03-14"));

      expect(baseProps.onChange).toHaveBeenCalledWith(
        "startDate",
        expectedLocalTime("2026-03-14", 10, 0),
      );
      expect(baseProps.onChange).toHaveBeenLastCalledWith(
        "endDate",
        expectedLocalTime("2026-03-14", 11, 0),
      );
    });

    it("second tap sets the last day of a multi-day event", () => {
      render(<Harness {...baseProps} />);

      fireEvent.click(dayButton("2026-03-14"));
      fireEvent.click(dayButton("2026-03-16"));

      expect(baseProps.onChange).toHaveBeenLastCalledWith(
        "endDate",
        expectedLocalTime("2026-03-16", 11, 0),
      );
    });

    it("lets the start move earlier after picking a later day (regression)", () => {
      render(<Harness {...baseProps} startDate="2026-03-10T10:00" endDate="2026-03-10T11:00" />);

      fireEvent.click(dayButton("2026-03-20"));
      expect(dayButton("2026-03-12")).not.toBeDisabled();

      fireEvent.click(dayButton("2026-03-12"));
      expect(baseProps.onChange).toHaveBeenCalledWith(
        "startDate",
        expectedLocalTime("2026-03-12", 10, 0),
      );
      expect(baseProps.onChange).toHaveBeenLastCalledWith(
        "endDate",
        expectedLocalTime("2026-03-20", 11, 0),
      );
    });

    it("keeps an edited event's past start day selectable", () => {
      render(<DatePickerImpl {...baseProps} />);
      expect(dayButton("2026-03-07")).not.toBeDisabled();
      expect(dayButton("2026-03-06")).toBeDisabled();
    });
  });

  describe("all-day mode", () => {
    const allDayProps = {
      ...baseProps,
      enableAllDayToggle: true,
      isAllDay: false,
      onToggleAllDay: vi.fn(),
    };

    it("renders all-day toggle when enableAllDayToggle is true", () => {
      render(<DatePickerImpl {...allDayProps} />);
      expect(
        screen.getByText("Tot el dia (sense hora de fi)")
      ).toBeInTheDocument();
    });

    it("hides time inputs when isAllDay is true", () => {
      render(<DatePickerImpl {...allDayProps} isAllDay={true} />);

      expect(screen.getByRole("grid")).toBeInTheDocument();
      expect(screen.queryByLabelText("Hora d'inici")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Hora de fi")).not.toBeInTheDocument();
    });

    it("ends an all-day range at 23:59 of the last day", () => {
      render(<Harness {...allDayProps} isAllDay={true} />);

      fireEvent.click(dayButton("2026-03-14"));
      fireEvent.click(dayButton("2026-03-20"));

      expect(baseProps.onChange).toHaveBeenLastCalledWith(
        "endDate",
        expectedLocalTime("2026-03-20", 23, 59),
      );
    });

    it("calls onToggleAllDay when toggle is clicked", () => {
      render(<DatePickerImpl {...allDayProps} />);

      fireEvent.click(screen.getByRole("switch"));
      expect(allDayProps.onToggleAllDay).toHaveBeenCalledWith(true);
    });
  });

  describe("time selection", () => {
    it("calls onChange with updated start time", () => {
      render(<DatePickerImpl {...baseProps} />);

      fireEvent.change(screen.getByLabelText("Hora d'inici"), {
        target: { value: "08:30" },
      });

      expect(baseProps.onChange).toHaveBeenCalledWith(
        "startDate",
        expectedLocalTime("2026-03-07", 8, 30),
      );
    });

    it("calls onChange with updated end time", () => {
      render(<DatePickerImpl {...baseProps} />);

      fireEvent.change(screen.getByLabelText("Hora de fi"), {
        target: { value: "15:00" },
      });

      expect(baseProps.onChange).toHaveBeenCalledWith(
        "endDate",
        expectedLocalTime("2026-03-07", 15, 0),
      );
    });

    it("moves the end to start + 60 min when the start passes it", () => {
      render(<DatePickerImpl {...baseProps} />);

      fireEvent.change(screen.getByLabelText("Hora d'inici"), {
        target: { value: "23:00" },
      });

      expect(baseProps.onChange).toHaveBeenCalledWith(
        "endDate",
        expectedLocalTime("2026-03-07", 24, 0),
      );
    });

    it("moves the end to start + 15 min when it is set before the start", () => {
      render(<DatePickerImpl {...baseProps} />);

      fireEvent.change(screen.getByLabelText("Hora de fi"), {
        target: { value: "09:00" },
      });

      expect(baseProps.onChange).toHaveBeenCalledWith(
        "endDate",
        expectedLocalTime("2026-03-07", 10, 15),
      );
    });
  });
});
