# Patterns Directory

This folder hosts composed UI components (molecules/organisms) built from primitives.

## Guidelines

- **Composition:** Patterns should compose primitives and smaller patterns without duplicating logic.
- **Business Logic:** Keep business-specific concerns in `components/ui/domain/`. Patterns should remain reusable across domains.
- **Variants:** Expose well-typed variant props (`variant`, `size`, etc.) with discriminated unions defined in `types/ui/patterns.ts` and `types/ui/variants.ts`.
- **Documentation:** Include prop tables, usage examples, and state diagrams when useful.
- **Testing:** Cover interaction states (loading, disabled, error) using React Testing Library and jest-axe.

## Suggested Structure

```
Card/
  Card.tsx          // Root component
  CardHeader.tsx    // Compound subcomponent
  CardContent.tsx
  CardFooter.tsx
  Card.test.tsx
  index.ts          // Barrel export for compound API
```

Document compound components in the README inside each folder or via Storybook stories.
