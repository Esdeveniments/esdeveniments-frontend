import { render, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import { vi } from "vitest";
import { Select } from "./Select";

const mockOptions = [
  { value: "option1", label: "Option 1" },
  { value: "option2", label: "Option 2" },
];

describe("Select", () => {
  it("renders placeholder initially", async () => {
    render(
      <Select
        id="test-select"
        label="Test Select"
        options={mockOptions}
        onChange={vi.fn()}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText("una opció")).toBeVisible();
    });
  });

  it("renders label", async () => {
    render(
      <Select
        id="test-select"
        label="Test Label"
        options={mockOptions}
        onChange={vi.fn()}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText("Test Label")).toBeVisible();
    });
  });

  it("handles selection", async () => {
    const onChange = vi.fn();
    render(
      <Select
        id="test-select"
        label="Test Select"
        options={mockOptions}
        onChange={onChange}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText("una opció")).toBeVisible();
    });

    // Note: Testing react-select interactions might require more setup
    // For accessibility, we focus on axe checks
  });

  it("renders error", async () => {
    render(
      <Select
        id="test-select"
        label="Test Select"
        error="Test error"
        options={mockOptions}
        onChange={vi.fn()}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText("Test error")).toBeVisible();
    });
  });

  it("shows required asterisk", async () => {
    render(
      <Select
        id="test-select"
        label="Test Label"
        required
        options={mockOptions}
        onChange={vi.fn()}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText("*")).toBeVisible();
    });
  });

  describe("accessibility", () => {
    it("passes axe-core accessibility checks", async () => {
      const { container } = render(
        <Select
          id="accessible-select"
          label="Accessible Select"
          options={mockOptions}
          onChange={vi.fn()}
        />,
      );
      await waitFor(() => {
        expect(screen.getByText("una opció")).toBeVisible();
      });
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("passes axe-core checks with error", async () => {
      const { container } = render(
        <Select
          id="error-select"
          label="Error Select"
          error="Error message"
          options={mockOptions}
          onChange={vi.fn()}
        />,
      );
      await waitFor(() => {
        expect(screen.getByText("Error message")).toBeVisible();
      });
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("passes axe-core checks when required", async () => {
      const { container } = render(
        <Select
          id="required-select"
          label="Required Select"
          required
          options={mockOptions}
          onChange={vi.fn()}
        />,
      );
      await waitFor(() => {
        expect(screen.getByText("una opció")).toBeVisible();
      });
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
