import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("renders with default variant", () => {
    const { container } = render(<Skeleton />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass("animate-fast-pulse", "bg-darkCorp");
  });

  describe("variants", () => {
    const simpleVariants = ["text", "avatar"] as const;

    it.each(simpleVariants)("applies the %s variant classes", (variant) => {
      const { container } = render(<Skeleton variant={variant} />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass("animate-fast-pulse", "bg-darkCorp");

      if (variant === "avatar") {
        expect(skeleton).toHaveClass("rounded-full");
      } else {
        expect(skeleton).toHaveClass("rounded");
      }
    });

    it("renders complex card variant", () => {
      const { container } = render(<Skeleton variant="card" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass(
        "mb-2xl",
        "flex",
        "cursor-pointer",
        "flex-col",
        "justify-center",
        "overflow-hidden",
        "bg-whiteCorp",
      );
    });
  });

  describe("custom className", () => {
    it("applies custom className", () => {
      const { container } = render(<Skeleton className="h-4 w-32" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass("h-4", "w-32");
    });
  });

  describe("accessibility", () => {
    it("passes axe-core accessibility checks for default skeleton", async () => {
      const { container } = render(<Skeleton />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("passes axe-core checks for simple variants", async () => {
      const variants = ["text", "avatar"] as const;
      for (const variant of variants) {
        const { container } = render(<Skeleton variant={variant} />);
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      }
    });

    it("passes axe-core checks for complex card variant", async () => {
      const { container } = render(<Skeleton variant="card" />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
