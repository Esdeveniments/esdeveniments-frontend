# Component Implementation Template

Use this template when extracting components into the new library structure.

## 1. File Layout

```
Button/
  Button.tsx
  Button.test.tsx
  Button.stories.tsx (optional)
  Button.constants.ts (optional variants/sizes)
  index.ts
```

## 2. Component Skeleton (Primitives)

````tsx
import { forwardRef } from "react";
import type { ButtonProps } from "types/ui";
import { cn } from "@components/utils/cn";
import { BUTTON_VARIANTS, BUTTON_SIZES } from "./Button.constants";

/**
 * Button component with multiple variants and sizes.
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="md">Submit</Button>
 * ```
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "neutral",
      size = "md",
      isLoading,
      children,
      ...rest
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md font-medium transition",
          BUTTON_VARIANTS[variant],
          BUTTON_SIZES[size],
          isLoading && "pointer-events-none opacity-70",
          className,
        )}
        aria-busy={isLoading}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
````

## 3. Variant Constants Example

```ts
import type { ButtonVariant, ButtonSize } from "types/ui";

export const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  neutral:
    "border border-blackCorp/10 bg-whiteCorp text-blackCorp hover:bg-darkCorp",
  primary: "bg-primary text-whiteCorp hover:bg-primarydark",
  outline: "border border-primary text-primary hover:bg-primary/5",
  muted: "bg-darkCorp text-blackCorp",
  solid: "bg-blackCorp text-whiteCorp",
};

export const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-base",
  lg: "h-12 px-6 text-lg",
};
```

## 4. Test Template

```tsx
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { Button } from "./Button";

describe("Button", () => {
  it("renders label", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: /click me/i })).toBeVisible();
  });

  it("applies variant classes", () => {
    const { container } = render(<Button variant="primary">Label</Button>);
    expect(container.firstChild).toHaveClass("bg-primary");
  });

  it("is accessible", async () => {
    const { container } = render(<Button>Accessible</Button>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

## 5. Barrel Export (`index.ts`)

```ts
export { Button } from "./Button";
export type { ButtonProps } from "types/ui";
```

## 6. Checklist

- [ ] Props imported from `types/ui`
- [ ] Boolean/handler names follow conventions (`is*/has*/on*`)
- [ ] Tailwind variants/sizes defined in constants (+ `cn` used)
- [ ] Accessibility attributes & keyboard behavior covered
- [ ] Unit tests + `jest-axe` accessibility test
- [ ] README/Storybook or doc entry updated
- [ ] Barrel export added

```

```
