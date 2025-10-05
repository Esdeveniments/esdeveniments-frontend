import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "jest-axe";
import { vi } from "vitest";
import { Modal } from "./Modal";

// Mock Heroicons
vi.mock("@heroicons/react/outline", () => ({
  XIcon: () => <svg data-testid="x-icon" />,
}));

describe("Modal", () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    children: <div>Modal content</div>,
  };

  it("renders modal content when open", () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByText("Modal content")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<Modal {...defaultProps} open={false} />);
    expect(screen.queryByText("Modal content")).not.toBeInTheDocument();
  });

  it("renders title when provided", () => {
    render(<Modal {...defaultProps} title="Test Modal" />);
    expect(screen.getByText("Test Modal")).toBeInTheDocument();
  });

  it("renders close button", () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByTestId("x-icon")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId("x-icon").closest("button")!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when clicking overlay", () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);
    fireEvent.click(
      screen.getByText("Modal content").parentElement!.parentElement!,
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when clicking modal content", () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText("Modal content"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose on Escape key press", () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("applies custom className", () => {
    const { container } = render(
      <Modal {...defaultProps} className="custom-class" />,
    );
    const modalContent = container.querySelector(".custom-class");
    expect(modalContent).toBeInTheDocument();
  });

  describe("accessibility", () => {
    it("passes axe-core checks", async () => {
      const { container } = render(<Modal {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("has proper aria-label on close button", () => {
      render(<Modal {...defaultProps} />);
      const closeButton = screen.getByTestId("x-icon").closest("button");
      expect(closeButton).toHaveAttribute("aria-label", "Close modal");
    });
  });
});
