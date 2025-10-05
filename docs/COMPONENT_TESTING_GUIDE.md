# Component Testing Guide

This guide summarizes the testing expectations for components in the new library.

## Tools

- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [jest-axe](https://github.com/nickcolley/jest-axe) for accessibility assertions
- [@testing-library/user-event](https://testing-library.com/docs/ecosystem-user-event/) for keyboard/mouse interactions

## Test Types

1. **Rendering & Variants** – Ensure all visual variants render correctly.
2. **State & Behavior** – Loading, disabled, focus, keyboard interactions.
3. **Accessibility** – `jest-axe` checks for violations.
4. **Snapshots** – Avoid unless absolutely necessary.

## Example

```tsx
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { Button } from "./Button";

describe("Button", () => {
  it("renders with label", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: /click me/i })).toBeVisible();
  });

  it("handles keyboard interactions", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    screen.getByRole("button").focus();
    screen.getByRole("button").click();
    expect(onClick).toHaveBeenCalled();
  });

  it("is accessible", async () => {
    const { container } = render(<Button>Accessible</Button>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

## Coverage Targets

| Component Type | Coverage |
| -------------- | -------- |
| Primitives     | ≥ 90%    |
| Patterns       | ≥ 80%    |
| Domain         | ≥ 75%    |

## Checklist

- [ ] Render test covers primary usage
- [ ] Variant tests ensure correct classes
- [ ] Loading/disabled states verified
- [ ] Keyboard navigation tested (if interactive)
- [ ] `jest-axe` accessibility test added
- [ ] User interactions tested with `user-event`
