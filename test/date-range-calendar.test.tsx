import { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DateRangeCalendar from "@components/ui/common/form/DateRangeCalendar";

vi.mock("react-day-picker/style.css", () => ({}));

function Harness({ onChange }: { onChange: (from: string, to: string) => void }) {
  const [range, setRange] = useState({ from: "", to: "" });
  return (
    <DateRangeCalendar
      fromDate={range.from}
      toDate={range.to}
      minDate="2030-05-01"
      onChange={(from, to) => {
        setRange({ from, to });
        onChange(from, to);
      }}
    />
  );
}

const tapDay = (day: number) =>
  fireEvent.click(
    document.querySelector(`[data-day="2030-05-${String(day).padStart(2, "0")}"] button`)!,
  );

describe("DateRangeCalendar", () => {
  it("first tap is a one-day range, second tap ends it, third tap starts over", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    tapDay(10);
    expect(onChange).toHaveBeenLastCalledWith("2030-05-10", "2030-05-10");

    tapDay(12);
    expect(onChange).toHaveBeenLastCalledWith("2030-05-10", "2030-05-12");

    tapDay(20);
    expect(onChange).toHaveBeenLastCalledWith("2030-05-20", "2030-05-20");
  });

  it("a second tap before the start swaps the ends", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    tapDay(10);
    tapDay(5);
    expect(onChange).toHaveBeenLastCalledWith("2030-05-05", "2030-05-10");
  });

  it("shows the month of a range set from outside, like a chip", () => {
    const { rerender } = render(
      <DateRangeCalendar fromDate="" toDate="" minDate="2030-05-01" onChange={vi.fn()} />,
    );
    expect(document.querySelector('[data-day="2030-07-10"]')).toBeNull();

    rerender(
      <DateRangeCalendar
        fromDate="2030-07-10"
        toDate="2030-07-31"
        minDate="2030-05-01"
        onChange={vi.fn()}
      />,
    );
    expect(document.querySelector('[data-day="2030-07-10"]')).not.toBeNull();
  });

  it("clear empties the range", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    tapDay(10);
    fireEvent.click(screen.getByRole("button", { name: "Esborra les dates" }));
    expect(onChange).toHaveBeenLastCalledWith("", "");
  });
});
