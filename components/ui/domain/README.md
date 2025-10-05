# Domain Components

This folder contains feature- or business-specific UI components that orchestrate primitives and patterns for concrete use cases.

## Guidelines

- **Scope:** Domain components can include business rules, formatting, and integration with data types from `types/api`.
- **Reusability:** Extract reusable pieces back into `primitives/` or `patterns/` whenever possible to avoid duplication.
- **Props:** Define prop interfaces in `types/ui/domain.ts` (to be created if needed) and keep them aligned with backend DTOs.
- **Testing:** Write integration-style tests that cover the component contract (rendered output, callbacks, accessibility).
- **Documentation:** Provide usage examples that explain context (e.g., which API DTOs are required).

## Example Structure

```
EventCard/
  EventCard.tsx
  EventCard.test.tsx
  index.ts
```

Domain components may nest subdirectories if multiple variants exist (e.g., `EventCard/Compact`, `EventCard/Detailed`).
