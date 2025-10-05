import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { vi } from "vitest";
import { Image } from "./Image";

// Mock hooks
vi.mock("@components/hooks/useOnScreen", () => ({
  default: () => false,
}));

vi.mock("@components/hooks/useNetworkSpeed", () => ({
  useNetworkSpeed: () => "high",
}));

vi.mock("@components/hooks/useImageRetry", () => ({
  useImageRetry: () => ({
    hasError: false,
    isLoading: false,
    handleError: vi.fn(),
    handleLoad: vi.fn(),
    getImageKey: () => "key",
  }),
}));

// Mock utils
vi.mock("@utils/image-quality", () => ({
  getOptimalImageQuality: () => 80,
  getOptimalImageSizes: () => "100vw",
  getServerImageQuality: () => 80,
}));

vi.mock("@utils/helpers", () => ({
  env: "prod",
}));

describe("Image", () => {
  it("renders fallback when no image prop", () => {
    render(<Image title="Test Title" />);
    expect(screen.getByRole("img", { name: "Test Title" })).toBeInTheDocument();
  });

  it("renders NextImage when image prop is provided", () => {
    render(<Image title="Test Title" image="/test.jpg" />);
    const img = screen.getByAltText("Test Title");
    expect(img).toBeInTheDocument();
  });

  it("passes alt prop correctly", () => {
    render(<Image title="Test Title" image="/test.jpg" alt="Custom Alt" />);
    const img = screen.getByAltText("Custom Alt");
    expect(img).toBeInTheDocument();
  });

  describe("accessibility", () => {
    it("passes axe-core accessibility checks", async () => {
      const { container } = render(<Image title="Test Title" />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
