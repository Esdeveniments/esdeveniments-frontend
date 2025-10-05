import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { vi } from "vitest";
import ImgDefault from "./ImgDefault";

vi.mock("./ImgDefaultCore", () => ({
  default: ({ alt }: any) => (
    <img alt={alt || "default"} data-testid="img-default-core" />
  ),
}));

describe("ImgDefault", () => {
  it("renders ImgDefaultCore with props", () => {
    render(<ImgDefault title="Test" />);
    expect(screen.getByTestId("img-default-core")).toBeInTheDocument();
  });

  describe("accessibility", () => {
    it("passes axe-core accessibility checks", async () => {
      const { container } = render(<ImgDefault title="Test" />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
