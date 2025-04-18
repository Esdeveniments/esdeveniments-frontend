# TypeScript Types & Interfaces Audit

_Last updated: 2025-04-18_

## 1. Current State & Findings

### A. Types/Interfaces Audit
- **Types are modular and interconnected:**
  - UI types (e.g., `CardContent`, `CardContentProps`) are built on top of DTOs from the API layer (e.g., `EventSummaryResponseDTO`).
- **Common/shared types** (like `Option`) are defined centrally (in `types/common.ts`), but sometimes re-declared locally in components (e.g., Select component).
- **Naming conventions** are clear and consistent (PascalCase for types/interfaces).

### B. Component Prop Typing
- **Good use of explicit prop interfaces:** Components use dedicated prop interfaces (e.g., `SelectComponentProps`).
- **Improvement area:** Shared types like `Option` are sometimes redefined locally instead of imported from the shared location, risking inconsistencies.
- **No use of `any` detected** in sampled files.

### C. Directory Structure
- **Types are organized by domain and API:**
  - `/types` for general/shared types
  - `/types/api` for DTOs from backend/API
  - Components organized by feature in `/components/ui/`
- **Scalable, but could be even clearer:**
  - Consider further grouping types into `/types/shared/`, `/types/domain/`, and `/types/api/` as the app grows.

---

## 2. Recommendations & Next Steps

### A. Strengthen Type Interconnection
- Always import shared types/interfaces (e.g., `Option`) from a single source of truth.
- Create a `/types/shared/` directory for global types/interfaces.
- Document dependencies between types/interfaces using comments or a markdown diagram.

### B. Prop Typing Consistency
- Audit all components to ensure prop interfaces are imported and reused, not redefined.
- Refactor components to use shared types/interfaces where possible.

### C. Directory Structure Proposal
```
/types
  /api         # API DTOs only
  /domain      # Business/domain-specific types
  /shared      # Generic, reusable types (Option, Maybe, etc.)
  common.ts    # (Optional: can be merged into shared/)
  index.ts     # Barrel file to re-export all types for easy import
```

### D. Type Safety Enforcement
- Enable strict mode in `tsconfig.json` for maximum type safety.
- Write utility types (e.g., `DeepPartial<T>`, `Nullable<T>`) and place them in `/types/shared/`.
- Add tests or runtime checks for critical type transformations if needed.

---

## 3. What’s Next?

1. Scan for and refactor all local redefinitions of shared types (like `Option`) to use a single source of truth.
2. Propose or implement the directory restructuring.
3. Create a markdown diagram or documentation snippet showing key type relationships.
4. (Optional) Add barrel files for easier imports.

---

## 4. Visual Example: Type Relationship Map

```
[API DTOs]
  └─ EventSummaryResponseDTO
        │
        ▼
  [UI Types]
    ├─ CardContent (Omit<EventSummaryResponseDTO, ...>)
    └─ CardContentProps { event: CardContent, ... }

[Shared Types]
  └─ Option { label: string, value: string }
      ▲
      │
  [Components]
    └─ SelectComponentProps { ... options: Option[] ... }
```

---

**This document should be updated as we refactor and improve the type system.**
