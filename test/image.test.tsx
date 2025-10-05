import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Image } from "../components/ui/primitives";

// Mock the sub-components
vi.mock("../components/ui/primitives/Image/ImageServer", () => ({
  default: ({ title }: any) => <div data-testid="image-server">{title}</div>,
}));

vi.mock("../components/ui/primitives/Image/ClientImage", () => ({
  ClientImage: ({ title }: any) => (
    <div data-testid="client-image">{title}</div>
  ),
}));

vi.mock("@components/hooks/useNetworkSpeed", () => ({
  useNetworkSpeed: vi.fn(() => "4g"),
}));

describe("Image", () => {
  it("renders ImageServer when no image prop is provided", () => {
    render(<Image title="Test Image" />);
    expect(screen.getByTestId("image-server")).toBeInTheDocument();
    expect(screen.getByText("Test Image")).toBeInTheDocument();
  });

  it("renders ClientImage when image prop is provided", () => {
    render(<Image title="Test Image" image="test.jpg" />);
    expect(screen.getByTestId("client-image")).toBeInTheDocument();
    expect(screen.getByText("Test Image")).toBeInTheDocument();
  });

  it("passes props to the rendered component", () => {
    const props = {
      title: "Test Image",
      image: "test.jpg",
      alt: "Alt text",
      className: "test-class",
      priority: true,
    };

    render(<Image {...props} />);
    expect(screen.getByTestId("client-image")).toBeInTheDocument();
  });

  it("passes context prop correctly", () => {
    render(<Image title="Test Image" context="card" />);
    expect(screen.getByTestId("image-server")).toBeInTheDocument();
  });
});
