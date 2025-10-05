import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import ViewCounter from "./ViewCounter";

describe("ViewCounter", () => {
  it("renders visits count", () => {
    render(<ViewCounter visits={123} />);
    expect(screen.getByText("123 visites")).toBeVisible();
  });

  it("renders with hideText true", () => {
    render(<ViewCounter visits={456} hideText />);
    expect(screen.getByText("456")).toBeVisible();
  });

  describe("accessibility", () => {
    it("passes axe-core accessibility checks", async () => {
      const { container } = render(<ViewCounter visits={100} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
