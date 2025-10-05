# Phase 3: Standardization Guidelines

This guide defines the conventions every new or migrated component must follow. It complements the architecture guide by specifying _how_ to implement components once the directory and type structure are in place.

---

## 1. Prop Interface Standards

| Area            | Guideline                                                                                             |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| Canonical types | Import props from `types/ui`. Extend variants in `types/ui/variants.ts`.                              |
| Naming          | Booleans → `is`, `has`, `should`; callbacks → `on`; data → descriptive nouns.                         |
| Defaults        | Provide defaults in the component signature (e.g., `variant = "neutral"`).                            |
| Composition     | Reuse base interfaces (`BasePrimitiveProps`). Compose primitives when building patterns/domain comps. |
| Documentation   | Add JSDoc with `@example`. Call out accessibility requirements (`aria-*`, `role`).                    |

```ts
import type { ButtonProps } from "types/ui";

export interface IconButtonProps extends ButtonProps {
  icon: ReactNode;
  label: string; // accessible text for screen readers
}
```

✅ **Prop Checklist**

- [ ] Props imported from `types/ui`
- [ ] Boolean props follow `is/has/should` naming
- [ ] Callbacks start with `on`
- [ ] Defaults provided for variant/size props
- [ ] JSDoc with `@example`

---

## 2. Tailwind Class Organization Patterns

| Topic        | Guideline                                                                                                  |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| Merging      | Always use `cn(...)`.                                                                                      |
| Variant maps | Store in `<Component>.constants.ts`. Values map to Tailwind classes.                                       |
| Tokens       | Use project tokens (`primary`, `blackCorp`, spacing scale).                                                |
| Responsive   | Co-locate responsive classes (`md:px-6`). Reference `tailwind.config.js` breakpoints (xs, sm, md, lg, xl). |
| States       | Include focus-visible rings. Use `[data-state]`/`[aria-*]` selectors when needed.                          |

```ts
export const DROPDOWN_VARIANTS = {
  default:
    "rounded-lg border border-blackCorp/10 bg-whiteCorp shadow-lg focus-visible:outline-none",
  danger: "border-primary bg-primary/5 text-primary",
};
```

✅ **Tailwind Checklist**

- [ ] All classes merged with `cn`
- [ ] Variant maps stored in constants
- [ ] Design tokens instead of hard-coded colors
- [ ] Responsive classes use project breakpoints
- [ ] Focus-visible styles included

---

## 3. Component Composition Patterns

### Compound Components

- Export subcomponents via barrel (`Card.Header`, `Card.Content`).
- Share state via context when needed (e.g., accordion). Keep context local.

### Slots & Render Props

- Provide `header`, `footer`, `actions`, etc. slots for flexibility.
- Lists/grids expose `renderItem` with typed `items` array.

### Loading & Empty States

- Expose `isLoading` and `renderEmpty` props where appropriate.
- Use standardized Skeleton components (coming in Phase 4) instead of custom loaders.

### Accessibility

- Use semantic elements (`<button>`, `<nav>`, `<ul>`).
- Wire ARIA attributes through subcomponents.
- Ensure focus management for overlays/modals.

✅ **Composition Checklist**

- [ ] Compound API exports provided where needed
- [ ] Slots/render props documented
- [ ] Loading/empty states supported
- [ ] Accessibility requirements satisfied (semantics, ARIA, focus)

---

## 4. Testing & Documentation Templates

### Testing Requirements

- **Unit tests:** React Testing Library for behavior + variant coverage.
- **Accessibility:** `jest-axe` required for primitives/patterns.
- **Coverage:**
  - Primitives ≥ 90%
  - Patterns/Domain ≥ 80%
- **Keyboard:** Validate tab order, keyboard shortcuts where applicable.

```tsx
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";

it("is accessible", async () => {
  const { container } = render(<Button>Save</Button>);
  expect(await axe(container)).toHaveNoViolations();
});
```

### Documentation Requirements

- Update JSDoc + README/Storybook notes after extraction.
- Include usage examples for top-level components.
- Update `docs/COMPONENT_TEMPLATE.md` if new patterns emerge.

✅ **Testing/Docs Checklist**

- [ ] Unit tests cover variants, states, events
- [ ] Accessibility test (`jest-axe`)
- [ ] Keyboard interactions verified
- [ ] README/Storybook entry updated
- [ ] JSDoc includes example

---

## 5. Migration Checklist (Phase 3)

1. Import prop interfaces from `types/ui`.
2. Create/extend variant maps and size tokens.
3. Implement component using `cn` + variant maps.
4. Add unit + accessibility tests.
5. Document usage (JSDoc, README/Storybook).
6. Update imports across the app to use new path.
7. Remove old component once references cleared.

> Copy this checklist into PR descriptions to keep reviews consistent.
