import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { Text } from "./Text";

describe("Text", () => {
  it("renders children", () => {
    render(<Text>Test content</Text>);
    expect(screen.getByText("Test content")).toBeVisible();
  });

  it("applies variant classes", () => {
    const { container } = render(<Text variant="h1">Heading</Text>);
    const span = container.firstChild as HTMLElement;
    expect(span).toHaveClass("font-barlow", "text-blackCorp");
  });

  it("applies custom className", () => {
    const { container } = render(<Text className="custom">Text</Text>);
    const span = container.firstChild as HTMLElement;
    expect(span).toHaveClass("custom");
  });

  it("renders as span by default", () => {
    const { container } = render(<Text>Content</Text>);
    expect((container.firstChild as HTMLElement)?.tagName).toBe("SPAN");
  });

  it("renders as semantic h1 element", () => {
    const { container } = render(<Text as="h1">Heading 1</Text>);
    expect((container.firstChild as HTMLElement)?.tagName).toBe("H1");
  });

  it("renders as semantic h2 element", () => {
    const { container } = render(<Text as="h2">Heading 2</Text>);
    expect((container.firstChild as HTMLElement)?.tagName).toBe("H2");
  });

  it("renders as semantic h3 element", () => {
    const { container } = render(<Text as="h3">Heading 3</Text>);
    expect((container.firstChild as HTMLElement)?.tagName).toBe("H3");
  });

  it("renders as semantic p element", () => {
    const { container } = render(<Text as="p">Paragraph</Text>);
    expect((container.firstChild as HTMLElement)?.tagName).toBe("P");
  });

  it("applies variant classes with semantic elements", () => {
    const { container } = render(
      <Text as="h1" variant="h1">
        Heading
      </Text>,
    );
    const element = container.firstChild as HTMLElement;
    expect(element.tagName).toBe("H1");
    expect(element).toHaveClass("font-barlow");
    expect(element).toHaveClass("text-blackCorp");
    // Note: variant classes are applied but size defaults may override specific text sizes
  });

  describe("accessibility", () => {
    it("passes axe-core accessibility checks", async () => {
      const { container } = render(<Text>Test</Text>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
