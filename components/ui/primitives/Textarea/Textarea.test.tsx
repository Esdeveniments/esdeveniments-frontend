import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { vi } from "vitest";
import { Textarea } from "./Textarea";

describe("Textarea", () => {
  it("renders with default label", () => {
    render(<Textarea value="test" onChange={vi.fn()} />);
    expect(screen.getByText("Descripció")).toBeVisible();
  });

  it("renders with custom label", () => {
    render(<Textarea label="Custom Label" value="test" onChange={vi.fn()} />);
    expect(screen.getByText("Custom Label")).toBeVisible();
  });

  it("renders textarea with value", () => {
    render(<Textarea value="Test content" onChange={vi.fn()} />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveValue("Test content");
  });

  it("handles typing", async () => {
    const onChange = vi.fn();
    render(<Textarea value="" onChange={onChange} />);
    const textarea = screen.getByRole("textbox");

    await userEvent.type(textarea, "Hello");
    expect(onChange).toHaveBeenCalled();
  });

  it("shows error", () => {
    render(<Textarea error="Test error" value="test" onChange={vi.fn()} />);
    expect(screen.getByText("Test error")).toBeVisible();
  });

  it("shows helper text", () => {
    render(
      <Textarea helperText="Test helper" value="test" onChange={vi.fn()} />,
    );
    expect(screen.getByText("Test helper")).toBeVisible();
  });

  it("shows required asterisk", () => {
    render(
      <Textarea label="Required" required value="test" onChange={vi.fn()} />,
    );
    expect(screen.getByText("*")).toBeVisible();
  });

  it("displays character count", () => {
    render(<Textarea value="12345" onChange={vi.fn()} />);
    expect(screen.getByText("5/1000")).toBeVisible();
  });

  describe("preview mode", () => {
    it("toggles to preview mode", async () => {
      render(<Textarea value="Test content" onChange={vi.fn()} />);
      const toggleButton = screen.getByText("👁️ Previsualitzar");

      await userEvent.click(toggleButton);
      expect(screen.getByText("✏️ Editar")).toBeVisible();
      expect(screen.getByText("Test content")).toBeVisible();
    });
  });

  describe("states", () => {
    it("applies error styling", () => {
      render(<Textarea error="error" value="test" onChange={vi.fn()} />);
      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveClass("border-error");
    });
  });

  describe("accessibility", () => {
    it("passes axe-core accessibility checks", async () => {
      const { container } = render(
        <Textarea
          id="accessible-textarea"
          label="Accessible Textarea"
          value="Test"
          onChange={vi.fn()}
        />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("passes axe-core checks with error", async () => {
      const { container } = render(
        <Textarea
          id="error-textarea"
          label="Error Textarea"
          error="Error message"
          value="Test"
          onChange={vi.fn()}
        />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("passes axe-core checks with helper text", async () => {
      const { container } = render(
        <Textarea
          id="helper-textarea"
          label="Helper Textarea"
          helperText="Helper text"
          value="Test"
          onChange={vi.fn()}
        />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("passes axe-core checks when required", async () => {
      const { container } = render(
        <Textarea
          id="required-textarea"
          label="Required Textarea"
          required
          value="Test"
          onChange={vi.fn()}
        />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("passes axe-core checks in preview mode", async () => {
      const { container } = render(
        <Textarea
          id="preview-textarea"
          label="Preview Textarea"
          value="Test content"
          onChange={vi.fn()}
        />,
      );
      const toggleButton = screen.getByText("👁️ Previsualitzar");
      await userEvent.click(toggleButton);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
