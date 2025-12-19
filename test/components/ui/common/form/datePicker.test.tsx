import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";

const datePickerPropsById = new Map<string, Record<string, unknown>>();

vi.mock("react-datepicker", async () => {
  const React = await import("react");

  const MockDatePicker = (props: Record<string, unknown>) => {
    const id = typeof props.id === "string" ? props.id : "unknown";
    datePickerPropsById.set(id, props);
    return React.createElement("div", {
      "data-testid": `react-datepicker-${id}`,
    });
  };

  return {
    __esModule: true,
    default: MockDatePicker,
  };
});

describe("DatePickerComponent (end picker constraints)", () => {
  beforeEach(() => {
    datePickerPropsById.clear();
  });

  it("passes minTime/maxTime to end picker when start/end are same day", async () => {
    const { default: DatePickerComponent } = await import(
      "components/ui/common/form/datePicker"
    );

    render(
      <DatePickerComponent
        startDate={new Date(2025, 11, 18, 10, 0, 0).toISOString()}
        endDate={new Date(2025, 11, 18, 11, 0, 0).toISOString()}
        onChange={() => undefined}
        required={false}
      />
    );

    const endProps = datePickerPropsById.get("date-end");
    expect(endProps).toBeTruthy();

    const endStartDate = endProps?.startDate;
    const endEndDate = endProps?.endDate;

    expect(endProps?.minDate).toBe(endStartDate);
    expect(endProps?.minTime).toBe(endStartDate);

    const maxTime = endProps?.maxTime;
    expect(maxTime).toBeInstanceOf(Date);

    const maxTimeDate = maxTime as Date;
    const endEndDateValue = endEndDate as Date;

    expect(maxTimeDate.toDateString()).toBe(endEndDateValue.toDateString());
    expect(maxTimeDate.getHours()).toBe(23);
    expect(maxTimeDate.getMinutes()).toBe(59);
    expect(maxTimeDate.getSeconds()).toBe(59);
  });

  it("does not pass minTime/maxTime to end picker when end date is a different day", async () => {
    const { default: DatePickerComponent } = await import(
      "components/ui/common/form/datePicker"
    );

    render(
      <DatePickerComponent
        startDate={new Date(2025, 11, 18, 10, 0, 0).toISOString()}
        endDate={new Date(2025, 11, 19, 9, 0, 0).toISOString()}
        onChange={() => undefined}
        required={false}
      />
    );

    const endProps = datePickerPropsById.get("date-end");
    expect(endProps).toBeTruthy();

    expect(endProps?.minTime).toBeUndefined();
    expect(endProps?.maxTime).toBeUndefined();
  });

  it("all-day mode disables time selection without breaking constraints", async () => {
    const { default: DatePickerComponent } = await import(
      "components/ui/common/form/datePicker"
    );

    render(
      <DatePickerComponent
        startDate={new Date(2025, 11, 18, 10, 0, 0).toISOString()}
        endDate={new Date(2025, 11, 18, 11, 0, 0).toISOString()}
        isAllDay={true}
        onChange={() => undefined}
        required={false}
      />
    );

    const endProps = datePickerPropsById.get("date-end");
    expect(endProps).toBeTruthy();

    expect(endProps?.showTimeSelect).toBe(false);
    expect(endProps?.minDate).toBe(endProps?.startDate);

    expect(endProps?.minTime).toBeInstanceOf(Date);
    expect(endProps?.maxTime).toBeInstanceOf(Date);
  });
});
