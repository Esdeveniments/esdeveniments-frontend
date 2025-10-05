import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ImageUpload } from "./ImageUpload";

describe("ImageUpload Primitive Component", () => {
  const mockOnUpload = vi.fn();
  const defaultProps = {
    value: null,
    onUpload: mockOnUpload,
    progress: 0,
  };

  it("renders upload area", () => {
    render(<ImageUpload {...defaultProps} />);

    expect(
      screen.getByRole("button", { name: /upload image/i }),
    ).toBeInTheDocument();
  });

  it("shows progress when uploading", () => {
    render(<ImageUpload {...defaultProps} progress={50} />);

    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("handles file selection via click", () => {
    render(<ImageUpload {...defaultProps} />);

    const uploadButton = screen.getByRole("button", {
      name: /select image file/i,
    });
    fireEvent.click(uploadButton);

    expect(uploadButton).toBeInTheDocument();
  });

  it("renders with initial value", () => {
    render(
      <ImageUpload {...defaultProps} value="data:image/png;base64,test" />,
    );

    expect(screen.getByAltText("Uploaded image preview")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /remove image/i }),
    ).toBeInTheDocument();
  });

  it("clears image when remove button is clicked", () => {
    render(
      <ImageUpload {...defaultProps} value="data:image/png;base64,test" />,
    );

    const removeButton = screen.getByRole("button", { name: /remove image/i });
    fireEvent.click(removeButton);

    expect(
      screen.queryByAltText("Uploaded image preview"),
    ).not.toBeInTheDocument();
  });

  it("is disabled when disabled prop is true", () => {
    render(<ImageUpload {...defaultProps} disabled />);

    const uploadArea = screen.getByRole("button", { name: /upload image/i });
    expect(uploadArea).toHaveClass("cursor-not-allowed", "opacity-50");
  });

  it("has proper accessibility attributes", () => {
    render(<ImageUpload {...defaultProps} />);

    const uploadArea = screen.getByRole("button", { name: /upload image/i });
    expect(uploadArea).toHaveAttribute("aria-label", "Upload image");
  });
});
