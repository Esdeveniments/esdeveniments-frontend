import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import ShareButton from "./ShareButton";

describe("ShareButton", () => {
  it("renders", () => {
    render(<ShareButton slug="test" />);
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
  });

  describe("accessibility", () => {
    it("passes axe-core accessibility checks", async () => {
      const { container } = render(<ShareButton slug="test" />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
