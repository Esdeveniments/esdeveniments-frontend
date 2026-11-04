import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { DatePickerComponentProps } from "types/props";

vi.mock("@components/ui/common/form", () => ({
  Input: () => null, Select: () => null, TextArea: () => null,
  ImageUpload: () => null, MultiSelect: () => null,
  DatePicker: ({ onToggleAllDay }: DatePickerComponentProps) => (
    <>
      <button type="button" onClick={() => onToggleAllDay?.(true)}>All day</button>
      <button type="button" onClick={() => onToggleAllDay?.(false)}>Timed</button>
    </>
  ),
}));
import EventForm from "@components/ui/EventForm";

afterEach(() => vi.unstubAllEnvs());

describe.each(["Europe/Madrid", "UTC", "America/New_York"])("all-day editing in %s", (zone) => {
  it.each(["2026-03-29", "2026-10-25"])("keeps the date-only prefill on %s", (date) => {
    vi.stubEnv("TZ", zone);
    const changed = vi.fn();
    const form = {
      title: "Concert", description: "Concert de prova", type: "FREE" as const,
      startDate: date, endDate: date, startTime: null, endTime: null,
      region: { value: "1", label: "Region" }, town: { value: "2", label: "Town" },
      location: "Teatre", imageUrl: "https://example.com/cover.jpg",
      url: "", categories: [], email: "",
    };
    const props = {
      form, onSubmit: vi.fn(), submitLabel: "Save", isEditMode: true,
      cityOptions: [], categoryOptions: [], handleFormChange: changed,
      handleImageChange: vi.fn(), handleTownChange: vi.fn(), handleCategoriesChange: vi.fn(),
      progress: 0, imageToUpload: form.imageUrl,
    };
    render(<EventForm {...props} />);
    fireEvent.click(screen.getByTestId("next-button"));
    fireEvent.click(screen.getByTestId("next-button"));
    fireEvent.click(screen.getByText("All day"));
    expect(changed).toHaveBeenCalledWith("endDate", `${date}T23:59`);
    fireEvent.click(screen.getByText("Timed"));
    expect(changed).toHaveBeenCalledWith("startDate", `${date}T09:00`);
    expect(changed).toHaveBeenCalledWith("endDate", `${date}T10:00`);
  });
});
