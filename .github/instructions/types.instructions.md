---
applyTo: "types/**/*.ts"
---

# Type System Rules

- ALL types and interfaces MUST live in the `types/` directory — ESLint enforces this via `no-restricted-syntax`.
- No `any` — use `unknown` with proper narrowing when the type is truly unknown.
- Check `types/README.md` for canonical sources before adding new types:
  - API DTOs → `types/api/<domain>.ts`
  - Shared UI types → `types/common.ts`
  - Component props → `types/props.ts`
  - Domain-specific → `types/event.ts`, `types/filters.ts`, etc.
- Never duplicate types that already exist. Search `types/` first and import from the canonical source.
- Prefer extending existing interfaces over creating new overlapping ones.
- Verify with `yarn typecheck && yarn lint` after changes.
