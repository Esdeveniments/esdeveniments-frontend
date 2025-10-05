# Primitives Directory

This folder contains atomic UI components that form the foundation of the design system.

## Guidelines

- **Scope:** Keep components focused, reusable, and free of business logic.
- **Dependencies:** Avoid importing application-specific modules. Rely on shared utilities (`@components/utils/cn`) and props defined in `types/ui/primitives.ts`.
- **Type Safety:** Import prop interfaces from `types/ui` instead of defining inline types.
- **Structure:** Co-locate tests (`*.test.tsx`) and stories (`*.stories.tsx`, optional) with each component.
- **Documentation:** Each component should include JSDoc comments and, when appropriate, a README or usage notes in Storybook.

## File Template

```
Button/
  Button.tsx
  Button.test.tsx
  Button.stories.tsx (optional)
  index.ts
```

Use `index.ts` files to provide barrel exports for cleaner import paths.
