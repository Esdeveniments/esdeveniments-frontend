import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { RadioInput } from "./RadioInput";

// Mock the FormField component
vi.mock("../FormField", () => ({
  FormField: ({ children, error, required }: any) => (
    <div data-testid="form-field" data-error={error} data-required={required}>
      {children}
    </div>
  ),
}));

describe("RadioInput", () => {
  const defaultProps = {
    id: "test-radio",
    name: "test-group",
    value: "option1",
    checkedValue: "option1",
    onChange: vi.fn(),
    label: "Test Option",
  };

  it("renders the radio input with correct attributes", () => {
    render(<RadioInput {...defaultProps} />);

    const radio = screen.getByRole("radio", { name: /test option/i });
    expect(radio).toBeInTheDocument();
    expect(radio).toHaveAttribute("id", "test-radio");
    expect(radio).toHaveAttribute("name", "test-group");
    expect(radio).toBeChecked();
  });

  it("renders unchecked when value doesn't match checkedValue", () => {
    render(<RadioInput {...defaultProps} checkedValue="option2" />);

    const radio = screen.getByRole("radio", { name: /test option/i });
    expect(radio).not.toBeChecked();
  });

  it("calls onChange when radio is selected", () => {
    const onChange = vi.fn();
    render(<RadioInput {...defaultProps} onChange={onChange} />);

    const radio = screen.getByRole("radio", { name: /test option/i });
    fireEvent.click(radio);

    expect(onChange).toHaveBeenCalledWith("option1");
  });

  it("renders label correctly", () => {
    render(<RadioInput {...defaultProps} />);

    const radio = screen.getByRole("radio", { name: /test option/i });
    const label = (radio as HTMLInputElement).labels![0];
    expect(label).toBeInTheDocument();
    expect(label).toHaveAttribute("for", "test-radio");
  });

  it("applies disabled state", () => {
    render(<RadioInput {...defaultProps} disabled />);

    const radio = screen.getByRole("radio", { name: /test option/i });
    expect(radio).toBeDisabled();

    const label = (radio as HTMLInputElement).labels![0];
    expect(label).toHaveClass("cursor-not-allowed", "opacity-50");
  });

  it("applies required attribute", () => {
    render(<RadioInput {...defaultProps} required />);

    const radio = screen.getByRole("radio", { name: /test option/i });
    expect(radio).toBeRequired();
  });

  it("handles error state", () => {
    render(<RadioInput {...defaultProps} error="This field is required" />);

    const radio = screen.getByRole("radio", { name: /test option/i });
    expect(radio).toHaveAttribute("aria-invalid", "true");
    expect(radio).toHaveAttribute("aria-describedby", "test-radio-error");
  });

  it("wraps with FormField when error is provided", () => {
    render(<RadioInput {...defaultProps} error="Error message" />);

    const formField = screen.getByTestId("form-field");
    expect(formField).toHaveAttribute("data-error", "Error message");
  });

  it("wraps with FormField when required is provided", () => {
    render(<RadioInput {...defaultProps} required />);

    const formField = screen.getByTestId("form-field");
    expect(formField).toHaveAttribute("data-required", "true");
  });

  it("applies custom className", () => {
    render(<RadioInput {...defaultProps} className="custom-radio-class" />);

    const container = screen.getByRole("radio", {
      name: /test option/i,
    }).parentElement;
    expect(container).toHaveClass("custom-radio-class");
  });

  it("handles numeric values", () => {
    const onChange = vi.fn();
    render(
      <RadioInput
        {...defaultProps}
        value={42}
        checkedValue={42}
        onChange={onChange}
      />,
    );

    const radio = screen.getByRole("radio", { name: /test option/i });
    expect(radio).toBeChecked();

    fireEvent.click(radio);
    expect(onChange).toHaveBeenCalledWith(42);
  });

  it("forwards additional props to input element", () => {
    render(<RadioInput {...defaultProps} data-testid="custom-radio" />);

    const radio = screen.getByTestId("custom-radio");
    expect(radio).toBeInTheDocument();
  });

  it("has proper focus styles", () => {
    render(<RadioInput {...defaultProps} />);

    const radio = screen.getByRole("radio", { name: /test option/i });
    expect(radio).toHaveClass(
      "focus:ring-2",
      "focus:ring-primary/50",
      "focus:ring-offset-2",
    );
  });

  it("has proper checked and unchecked styles", () => {
    const { rerender } = render(
      <RadioInput {...defaultProps} checkedValue="option1" />,
    );

    const radio = screen.getByRole("radio", { name: /test option/i });
    expect(radio).toHaveClass("bg-primary", "border-primary");

    rerender(<RadioInput {...defaultProps} checkedValue="option2" />);
    expect(radio).toHaveClass("bg-white", "border-bColor");
  });

  it("has proper error styles", () => {
    render(<RadioInput {...defaultProps} error="Error" />);

    const radio = screen.getByRole("radio", { name: /test option/i });
    expect(radio).toHaveClass(
      "border-destructive",
      "focus:ring-destructive/50",
    );
  });
});
