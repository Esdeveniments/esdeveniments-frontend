# Component Library Architecture Guide (Phase 2)

This document captures the structural conventions and guidelines for the component library during Phase 2 (Architecture & Organization).

## Directory Structure

```
components/ui/
├── primitives/   # Atomic components (Button, Input, Badge)
├── patterns/     # Composed components (Card, Modal, List)
├── domain/       # Feature-specific components (EventCard, NewsCard)
└── utils/        # Shared utilities (e.g., cn.ts)
```

### Primitives (`components/ui/primitives/`)

- Keep components focused, accessible, and free from domain logic.
- Co-locate tests (`*.test.tsx`) and stories (`*.stories.tsx`, optional).
- Re-export via `index.ts` to simplify imports (e.g., `export { Button } from "./Button";`).
- Use prop interfaces from `types/ui` (`ButtonProps`, `InputProps`, etc.).

### Patterns (`components/ui/patterns/`)

- Compose primitives and smaller patterns to form flexible building blocks.
- Define variant unions in `types/ui/variants.ts`.
- Support composition via compound component APIs when appropriate (e.g., `Card.Header`).
- Include skeleton/loading states to standardize async UX.

### Domain (`components/ui/domain/`)

- Encapsulate feature-specific UI (events, news, promotions, etc.).
- Can include business rules and data shaping.
- Extract reusable pieces back into primitives/patterns whenever duplication appears.

### Utilities (`components/ui/utils/`)

- Houses shared helpers like `cn.ts`.
- Keep utilities framework-agnostic when possible.

## Type Organization

```
types/ui/
├── primitives.ts  # Atom contracts (ButtonProps, InputProps)
├── patterns.ts    # Molecule/organism contracts (CardProps, ModalProps)
├── variants.ts    # Shared variant tokens & Tailwind mapping helpers
└── index.ts       # Barrel exports for the UI type namespace
```

Guidelines:

- Import prop interfaces via `
