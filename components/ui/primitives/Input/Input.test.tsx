import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Input } from "./Input";

describe("Input", () => {
  it("renders with placeholder", () => {
    render(<Input placeholder="Your name" />);
    expect(screen.getByPlaceholderText(/your name/i)).toBeVisible();
  });

  it("accepts typing and change handler", async () => {
    const onChange = vi.fn();
    render(<Input placeholder="Type" onChange={onChange} />);

    await userEvent.type(screen.getByPlaceholderText(/type/i), "abc");

    expect(onChange).toHaveBeenCalled();
  });

  it.each(["sm", "md", "lg"] as const)("supports %s size", (size) => {
    const { container } = render(<Input size={size} />);
    expect(container.firstChild).toHaveClass("block", "w-full");
  });

  it.each(["default", "error", "success"] as const)(
    "supports %s variant",
    (variant) => {
      const { container } = render(<Input variant={variant} />);
      expect(container.firstChild).toHaveClass("block", "w-full");
    },
  );

  it("is accessible", async () => {
    const { container } = render(<Input aria-label="email" type="email" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
