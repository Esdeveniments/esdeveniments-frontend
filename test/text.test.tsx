import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { Text } from "../components/ui/primitives/Text/Text";

describe("Text", () => {
  it("renders children content", () => {
    render(<Text>Test content</Text>);
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("applies classes for different variants", () => {
    const { container: h1Container } = render(<Text variant="h1">H1</Text>);
    const { container: bodyContainer } = render(
      <Text variant="body">Body</Text>,
    );

    const h1Element = h1Container.firstChild as HTMLElement;
    const bodyElement = bodyContainer.firstChild as HTMLElement;

    expect(h1Element).toHaveClass("text-blackCorp");
    expect(bodyElement).toHaveClass("text-blackCorp");
  });

  it("applies custom className", () => {
    const { container } = render(<Text className="custom-class">Content</Text>);
    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("renders as span by default", () => {
    const { container } = render(<Text>Content</Text>);
    expect((container.firstChild as HTMLElement)?.tagName).toBe("SPAN");
  });

  it("passes through additional props", () => {
    render(<Text data-testid="text-element">Content</Text>);
    expect(screen.getByTestId("text-element")).toBeInTheDocument();
  });

  describe("variants", () => {
    const variants = [
      "h1",
      "h2",
      "h3",
      "body",
      "body-lg",
      "body-sm",
      "caption",
    ] as const;

    it.each(variants)("applies %s variant classes", (variant) => {
      const { container } = render(<Text variant={variant}>Content</Text>);
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass("text-blackCorp");
    });
  });

  describe("typography variants", () => {
    const typographyVariants = [
      "body",
      "body-lg",
      "body-sm",
      "caption",
    ] as const;

    it.each(typographyVariants)("applies %s variant classes", (variant) => {
      const { container } = render(<Text variant={variant}>Content</Text>);
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass("text-blackCorp");
    });
  });

  describe("colors", () => {
    const colorTests = [
      { color: "primary", expectedClass: "text-primary" },
      { color: "black", expectedClass: "text-blackCorp" },
      { color: "muted", expectedClass: "text-blackCorp/60" },
    ] as const;

    it.each(colorTests)(
      "applies $color color classes",
      ({ color, expectedClass }) => {
        const { container } = render(<Text color={color}>Content</Text>);
        const element = container.firstChild as HTMLElement;
        expect(element).toHaveClass(expectedClass);
      },
    );
  });

  describe("as prop", () => {
    const elements = ["h1", "h2", "p", "span", "a", "div"] as const;

    it.each(elements)("renders as %s element", (element) => {
      const { container } = render(<Text as={element}>Content</Text>);
      expect((container.firstChild as HTMLElement)?.tagName.toLowerCase()).toBe(
        element,
      );
    });
  });

  describe("accessibility", () => {
    it("passes axe-core accessibility checks", async () => {
      const { container } = render(<Text>Accessible text</Text>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("passes axe-core checks for heading variants", async () => {
      const { container } = render(<Text variant="h1">Heading</Text>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("passes axe-core checks for paragraph variant", async () => {
      const { container } = render(
        <Text as="p" variant="body">
          Paragraph
        </Text>,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("edge cases", () => {
    it("handles empty children", () => {
      const { container } = render(<Text />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it("handles null children", () => {
      const { container } = render(<Text>{null}</Text>);
      expect(container.firstChild).toBeInTheDocument();
    });

    it("handles undefined variant", () => {
      const { container } = render(<Text>Content</Text>);
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass("text-blackCorp");
    });

    it("handles custom props with semantic elements", () => {
      render(
        <Text as="a" data-href="#" aria-label="Link">
          Link
        </Text>,
      );
      const link = screen.getByText("Link");
      expect(link).toHaveAttribute("aria-label", "Link");
    });
  });
});
