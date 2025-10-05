import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { vi } from "vitest";
import { DatePicker } from "./DatePicker";

describe("DatePicker", () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it("renders labels", () => {
    render(
      <DatePicker
        label="Test DatePicker"
        startDate="2023-10-01T10:00"
        endDate="2023-10-01T12:00"
        onChange={mockOnChange}
      />,
    );
    expect(screen.getByText("Test DatePicker")).toBeVisible();
    expect(screen.getByText("Inici *")).toBeVisible();
    expect(screen.getByText("Final *")).toBeVisible();
  });

  it("renders with initial dates", () => {
    render(
      <DatePicker
        label="DatePicker"
        startDate="2023-10-01T10:00"
        endDate="2023-10-01T12:00"
        onChange={mockOnChange}
      />,
    );
    // Check if buttons are rendered (react-datepicker uses buttons)
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("shows error", () => {
    render(
      <DatePicker
        label="DatePicker"
        startDate="2023-10-01T10:00"
        endDate="2023-10-01T12:00"
        error="Test error"
        onChange={mockOnChange}
      />,
    );
    expect(screen.getByText("Test error")).toBeVisible();
  });

  it("shows helper text", () => {
    render(
      <DatePicker
        label="DatePicker"
        startDate="2023-10-01T10:00"
        endDate="2023-10-01T12:00"
        helperText="Test helper"
        onChange={mockOnChange}
      />,
    );
    expect(screen.getByText("Test helper")).toBeVisible();
  });

  it("shows required asterisk", () => {
    render(
      <DatePicker
        label="Required DatePicker"
        startDate="2023-10-01T10:00"
        endDate="2023-10-01T12:00"
        required
        onChange={mockOnChange}
      />,
    );
    expect(screen.getByText("*")).toBeVisible();
  });

  describe("accessibility", () => {
    it("passes axe-core accessibility checks", async () => {
      const { container } = render(
        <DatePicker
          label="Accessible DatePicker"
          startDate="2023-10-01T10:00"
          endDate="2023-10-01T12:00"
          onChange={mockOnChange}
        />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("passes axe-core checks with error", async () => {
      const { container } = render(
        <DatePicker
          label="Error DatePicker"
          startDate="2023-10-01T10:00"
          endDate="2023-10-01T12:00"
          error="Error message"
          onChange={mockOnChange}
        />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("passes axe-core checks with helper text", async () => {
      const { container } = render(
        <DatePicker
          label="Helper DatePicker"
          startDate="2023-10-01T10:00"
          endDate="2023-10-01T12:00"
          helperText="Helper text"
          onChange={mockOnChange}
        />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("passes axe-core checks when required", async () => {
      const { container } = render(
        <DatePicker
          label="Required DatePicker"
          startDate="2023-10-01T10:00"
          endDate="2023-10-01T12:00"
          required
          onChange={mockOnChange}
        />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
