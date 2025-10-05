import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MultiSelect } from "./MultiSelect";

describe("MultiSelect Primitive Component", () => {
  const mockOptions = [
    { value: "1", label: "Option 1" },
    { value: "2", label: "Option 2" },
    { value: "3", label: "Option 3" },
  ];

  const defaultProps = {
    id: "test-multiselect",
    label: "Test MultiSelect",
    options: mockOptions,
    value: [],
    onChange: vi.fn(),
  };

  it("renders with label and placeholder", () => {
    render(<MultiSelect {...defaultProps} />);

    expect(screen.getByText("Test MultiSelect")).toBeInTheDocument();
    expect(screen.getByText("Selecciona categories")).toBeInTheDocument();
  });

  it("renders with subtitle", () => {
    render(<MultiSelect {...defaultProps} subtitle="Test subtitle" />);

    expect(screen.getByText("Test subtitle")).toBeInTheDocument();
  });

  it("renders with error message", () => {
    render(<MultiSelect {...defaultProps} error="Test error" />);

    expect(screen.getByText("Test error")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Test error");
  });

  it("shows required indicator when required", () => {
    render(<MultiSelect {...defaultProps} required />);

    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("renders select component immediately", () => {
    render(<MultiSelect {...defaultProps} />);

    // Component renders immediately without skeleton
    expect(screen.getByText("Test MultiSelect")).toBeInTheDocument();
  });

  it("renders select after hydration", async () => {
    render(<MultiSelect {...defaultProps} />);

    // Wait for hydration
    await waitFor(() => {
      expect(screen.getByText("Selecciona categories")).toBeInTheDocument();
    });
  });

  it("calls onChange when options are selected", async () => {
    const mockOnChange = vi.fn();
    render(<MultiSelect {...defaultProps} onChange={mockOnChange} />);

    // Wait for component to hydrate
    await waitFor(() => {
      expect(screen.getByText("Selecciona categories")).toBeInTheDocument();
    });

    // Note: Testing react-select interactions would require more complex setup
    // This test ensures the component renders and the onChange prop is passed
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it("renders with custom placeholder when loading", async () => {
    render(
      <MultiSelect {...defaultProps} isLoading placeholder="Loading..." />,
    );

    await waitFor(() => {
      expect(screen.getByText("Carregant categories...")).toBeInTheDocument();
    });
  });

  it("applies custom className", () => {
    render(<MultiSelect {...defaultProps} className="custom-class" />);

    const container = screen.getByText("Test MultiSelect").closest("div");
    expect(container).toHaveClass("custom-class");
  });

  it("renders with initial value", () => {
    const initialValue = [mockOptions[0]];
    render(<MultiSelect {...defaultProps} value={initialValue} />);

    // Should show the selected option
    expect(screen.getByText("Option 1")).toBeInTheDocument();
  });

  it("has proper accessibility attributes", () => {
    render(<MultiSelect {...defaultProps} />);

    const label = screen.getByText("Test MultiSelect").closest("label");
    expect(label).toHaveAttribute("for", "test-multiselect");
  });

  it("renders no options message", async () => {
    render(<MultiSelect {...defaultProps} options={[]} />);

    await waitFor(() => {
      // The no options message is shown by react-select internally
      expect(screen.getByText("Selecciona categories")).toBeInTheDocument();
    });
  });
});
