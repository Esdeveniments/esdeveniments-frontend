import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { RangeInput } from "./RangeInput";

// Mock the FormField component
vi.mock("../FormField", () => ({
  FormField: ({ children, label, subtitle, error, required }: any) => (
    <div data-testid="form-field" data-error={error} data-required={required}>
      {label && <div data-testid="form-field-label">{label}</div>}
      {subtitle && <div data-testid="form-field-subtitle">{subtitle}</div>}
      {children}
    </div>
  ),
}));

// Mock Heroicons
vi.mock("@heroicons/react/outline/XIcon", () => ({
  default: ({ className, ...props }: any) => (
    <svg className={className} {...props} data-testid="x-icon">
      <path d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
}));

describe("RangeInput", () => {
  const defaultProps = {
    id: "test-range",
    label: "Distance",
    min: 10,
    max: 100,
    value: 50,
    onChange: vi.fn(),
  };

  it("renders the range input with correct attributes", () => {
    render(<RangeInput {...defaultProps} />);

    const range = screen.getByRole("slider");
    expect(range).toBeInTheDocument();
    expect(range).toHaveAttribute("id", "test-range");
    expect(range).toHaveAttribute("type", "range");
    expect(range).toHaveAttribute("min", "10");
    expect(range).toHaveAttribute("max", "100");
    expect(range).toHaveAttribute("value", "50");
  });

  it("displays the current value in the label", () => {
    render(<RangeInput {...defaultProps} />);

    expect(screen.getByText("50 km")).toBeInTheDocument();
  });

  it("calls onChange when range value changes", () => {
    const onChange = vi.fn();
    render(<RangeInput {...defaultProps} onChange={onChange} />);

    const range = screen.getByRole("slider");
    fireEvent.change(range, { target: { value: "75" } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(
      expect.any(Object), // Accept any event-like object
    );
  });

  it("shows clear button when value is not at minimum", () => {
    render(<RangeInput {...defaultProps} value={75} />);

    const clearButton = screen.getByRole("button", {
      name: /clear distance filter/i,
    });
    expect(clearButton).toBeInTheDocument();
  });

  it("does not show clear button when value is at minimum", () => {
    render(<RangeInput {...defaultProps} value={10} />);

    const clearButton = screen.queryByRole("button", {
      name: /clear distance filter/i,
    });
    expect(clearButton).not.toBeInTheDocument();
  });

  it("does not show clear button when value is 0", () => {
    render(<RangeInput {...defaultProps} value={0} min={0} />);

    const clearButton = screen.queryByRole("button", {
      name: /clear distance filter/i,
    });
    expect(clearButton).not.toBeInTheDocument();
  });

  it("calls onChange with minimum value when clear button is clicked", () => {
    const onChange = vi.fn();
    render(<RangeInput {...defaultProps} value={75} onChange={onChange} />);

    const clearButton = screen.getByRole("button", {
      name: /clear distance filter/i,
    });
    fireEvent.click(clearButton);

    expect(onChange).toHaveBeenCalledWith({
      target: { value: "10" },
    });
  });

  it("applies disabled state", () => {
    render(<RangeInput {...defaultProps} disabled />);

    const range = screen.getByRole("slider");
    expect(range).toBeDisabled();
  });

  it("handles error state", () => {
    render(<RangeInput {...defaultProps} error="This field is required" />);

    const range = screen.getByRole("slider");
    expect(range).toHaveAttribute("aria-invalid", "true");
    expect(range).toHaveAttribute("aria-describedby", "test-range-error");
  });

  it("wraps with FormField when label is provided", () => {
    render(<RangeInput {...defaultProps} />);

    const formField = screen.getByTestId("form-field");
    expect(formField).toBeInTheDocument();
  });

  it("wraps with FormField when error is provided", () => {
    render(<RangeInput {...defaultProps} error="Error message" />);

    const formField = screen.getByTestId("form-field");
    expect(formField).toHaveAttribute("data-error", "Error message");
  });

  it("wraps with FormField when required is provided", () => {
    render(<RangeInput {...defaultProps} required />);

    const formField = screen.getByTestId("form-field");
    expect(formField).toHaveAttribute("data-required", "true");
  });

  it("wraps with FormField when subtitle is provided", () => {
    render(<RangeInput {...defaultProps} subtitle="Additional context" />);

    const formField = screen.getByTestId("form-field");
    expect(formField).toBeInTheDocument();
  });

  it("renders without FormField wrapper when no label/error/required/subtitle", () => {
    render(<RangeInput {...defaultProps} label={undefined} />);

    const formField = screen.queryByTestId("form-field");
    expect(formField).not.toBeInTheDocument();

    const range = screen.getByRole("slider");
    expect(range).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<RangeInput {...defaultProps} className="custom-range-class" />);

    const container = screen.getByRole("slider").parentElement;
    expect(container).toHaveClass("custom-range-class");
  });

  it("handles numeric values correctly", () => {
    const onChange = vi.fn();
    render(<RangeInput {...defaultProps} value={42} onChange={onChange} />);

    const range = screen.getByRole("slider");
    expect(range).toHaveAttribute("value", "42");
    expect(screen.getByText("42 km")).toBeInTheDocument();
  });

  it("forwards additional props to input element", () => {
    render(<RangeInput {...defaultProps} data-testid="custom-range" />);

    const range = screen.getByTestId("custom-range");
    expect(range).toBeInTheDocument();
  });

  it("has proper accessibility attributes", () => {
    render(<RangeInput {...defaultProps} />);

    const range = screen.getByRole("slider");
    expect(range).toHaveAttribute("aria-valuemin", "10");
    expect(range).toHaveAttribute("aria-valuemax", "100");
    expect(range).toHaveAttribute("aria-valuenow", "50");
    expect(range).toHaveAttribute("aria-valuetext", "50 km");
  });

  it("has proper focus styles", () => {
    render(<RangeInput {...defaultProps} />);

    const range = screen.getByRole("slider");
    expect(range).toHaveClass(
      "focus:ring-2",
      "focus:ring-primary/50",
      "focus:ring-offset-2",
    );
  });

  it("has proper error styles", () => {
    render(<RangeInput {...defaultProps} error="Error" />);

    const range = screen.getByRole("slider");
    expect(range).toHaveClass("focus:ring-destructive/50");
  });

  it("handles edge case values", () => {
    // Test with value at minimum
    const { rerender } = render(<RangeInput {...defaultProps} value={10} />);
    expect(screen.getByText("10 km")).toBeInTheDocument();

    // Test with value at maximum
    rerender(<RangeInput {...defaultProps} value={100} />);
    expect(screen.getByText("100 km")).toBeInTheDocument();

    // Test with value below minimum (should still display)
    rerender(<RangeInput {...defaultProps} value={5} />);
    expect(screen.getByText("5 km")).toBeInTheDocument();
  });
});
