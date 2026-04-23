---
name: pre-implementation-checklist
description: MANDATORY checklist before writing ANY new code. Use this skill FIRST before implementing any feature, component, utility, type, or hook. Enforces DRY principle and existing pattern reuse.
---

# Pre-Implementation Checklist (MANDATORY)

⚠️ **STOP! Before writing ANY code, complete this checklist.**

This skill enforces the DRY principle and ensures you search for existing patterns before creating new ones. Skipping this checklist leads to code duplication and inconsistency.

---

## ✅ MANDATORY CHECKLIST (Complete Before Coding)

### Step 1: Search for Existing Patterns

**Before creating ANYTHING new, search the codebase:**

```bash
# Search by concept name
grep -r "slug validation" --include="*.ts" --include="*.tsx"
grep -r "price format" --include="*.ts" --include="*.tsx"

# Search by function name patterns
grep -r "isValid" --include="*.ts" utils/
grep -r "format" --include="*.ts" utils/
grep -r "build" --include="*.ts" utils/
grep -r "use[A-Z]" --include="*.ts" components/hooks/

# Search by literal values (regex, constants)
grep -r "YOUR_REGEX_PATTERN" --include="*.ts"
```

**Report findings BEFORE proposing implementation:**

- ✅ "Found `isValidCategorySlugFormat` in `utils/category-mapping.ts` - will reuse"
- ✅ "Found similar hook `useImageRetry` in `components/hooks/` - will extend"
- ✅ "No existing pattern found - will create new utility"

### Step 2: Check Canonical Locations

| What You're Creating | Where to Search First                       |
| -------------------- | ------------------------------------------- |
| Type/Interface       | `types/` directory, check `types/README.md` |
| Validation function  | `utils/` for `isValid*`, `validate*`        |
| Helper/Utility       | `utils/`, `lib/`                            |
| Constant/Config      | `utils/constants.ts`, `config/`             |
| Component            | `components/ui/`                            |
| Hook                 | `components/hooks/`                         |
| API call             | `lib/api/`                                  |

### Step 3: Verify No Duplication

**Check these specific files for existing patterns:**

```text
types/common.ts          → NavigationItem, SocialLinks, shared types
types/props.ts           → Reusable component props
types/api/*.ts           → DTOs (CitySummaryResponseDTO, etc.)
utils/constants.ts       → Shared constants (dates, distances, labels)
utils/api-helpers.ts     → buildEventsQuery, buildNewsQuery, getInternalApiUrl
config/filters.ts        → Filter configurations
```

### Step 4: Propose Plan (No Code Yet)

**After searching, propose a 2-4 step plan:**

```text
Plan:
1. Reuse `isValidSlug` from utils/validation.ts
2. Create new `PriceFilter` component in components/ui/filters/
3. Add type to types/filters.ts (extending existing FilterConfig)
4. Update tests in test/filter-system.test.ts
```

**Wait for user confirmation before implementing.**

---

## 🚫 ANTI-PATTERNS (Stop Immediately If You're Doing This)

### ❌ Writing Code First, Searching Later

```typescript
// WRONG: Implementing inline, then searching
const isValidSlug = (slug: string) => /^[a-z0-9-]+$/.test(slug);
// "Oh wait, let me check if this exists..."

// CORRECT: Search first, then decide
// "Searching for 'isValid.*Slug' in utils/..."
// "Found isValidCategorySlugFormat in utils/category-mapping.ts - reusing"
```

### ❌ Creating Types Outside /types

```typescript
// WRONG: Inline type in component
type ButtonProps = { variant: string; size: string };

// CORRECT: Define in types/props.ts
// types/props.ts
export interface ButtonProps {
  variant: ButtonVariant;
  size: ButtonSize;
}
```

### ❌ Duplicating Constants

```typescript
// WRONG: Hardcoded values
const DEFAULT_DISTANCE = 50;
const DATE_OPTIONS = ["avui", "dema", "setmana"];

// CORRECT: Import from constants
import { DEFAULT_DISTANCE, DATE_OPTIONS } from "@utils/constants";
```

### ❌ Creating Helper Used Only Once

```typescript
// WRONG: Over-abstraction
const formatEventTitle = (title: string) => title.trim();
// Only used in one place

// CORRECT: Inline simple logic, abstract only when reused
<h1>{event.title.trim()}</h1>;
```

### ❌ Creating Barrel Files (`index.ts`) for Component Folders

```typescript
// WRONG: Barrel re-exports "use client" components from different routes
// components/ui/sponsor/index.ts
export { default as SponsorBannerSlot } from "./SponsorBannerSlot";
export { default as CheckoutButton } from "./CheckoutButton";
export { default as PricingSectionClient } from "./PricingSectionClient";

// Any route importing SponsorBannerSlot from the barrel
// also leaks CheckoutButton + PricingSectionClient into its manifest!
import { SponsorBannerSlot } from "@components/ui/sponsor";

// CORRECT: Always use direct file imports
import SponsorBannerSlot from "@components/ui/sponsor/SponsorBannerSlot";
```

**Why**: In Next.js RSC, every `"use client"` module re-exported from a barrel gets registered in the `client-reference-manifest` of every route that imports from that barrel. This caused 24 KB of bloat on `/[place]` (Feb 2026). `optimizePackageImports` only works for npm packages.

### ❌ Time-Dependent Conditional Rendering in Server Components Without `connection()`

```typescript
// WRONG: new Date() drives tree structure in a cached server component
const status = computeTemporalStatus(event.startDate); // uses new Date()
return (
  <>
    {status.state !== "past" && <EventWeather />}  // tree shape changes over time!
    {status.state === "past" && <PastEventBanner />}
  </>
);

// CORRECT: call connection() first to opt out of component caching
import { connection } from "next/server";

await connection(); // signals dynamic rendering
const status = computeTemporalStatus(event.startDate);
// Now the conditional tree is safe — no stale cache replay
```

**Why**: With `cacheComponents: true`, React caches the RSC payload. If `new Date()` produces a different tree shape on replay (e.g., event went from "upcoming" to "past"), React throws "Couldn't find all resumable slots" and falls back to full client rendering — killing SSR performance and SEO. This caused repeated errors in production (Apr 2026). Content-only date usage (formatting text) is fine without `connection()`.

---

## 📋 Decision Tree: Should I Create New Code?

```text
┌─────────────────────────────────────────┐
│ Need to implement something new?        │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ Did you search for existing patterns?   │
│ (grep, semantic_search, file_search)    │
├─────────────────┬───────────────────────┤
│ NO              │ YES                   │
│ ↓               │ ↓                     │
│ STOP!           │ Continue              │
│ Search first    │                       │
└─────────────────┴───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ Found existing pattern?                 │
├─────────────────┬───────────────────────┤
│ YES             │ NO                    │
│ ↓               │ ↓                     │
│ REUSE or        │ Create new, but:      │
│ EXTEND it       │ - Place in canonical  │
│                 │   location            │
│                 │ - Follow conventions  │
│                 │ - Add tests           │
└─────────────────┴───────────────────────┘
```

---

## 📍 Canonical Locations Reference

### Types (MUST go in /types)

```text
types/
├── common.ts           # Shared UI types (NavigationItem, SocialLinks)
├── props.ts            # Component props (ButtonProps, CardProps)
├── event.ts            # Event domain types
├── filters.ts          # Filter types (FilterConfig, FilterState)
├── api/
│   ├── event.ts        # EventDTO, EventResponseDTO
│   ├── news.ts         # NewsDTO, NewsResponseDTO
│   ├── city.ts         # CitySummaryResponseDTO
│   └── ...
└── README.md           # Type organization guide
```

### Utilities (Check before creating)

```text
utils/
├── constants.ts        # Shared constants (CHECK FIRST!)
├── api-helpers.ts      # API query builders
├── url-filters.ts      # URL building
├── url-parsing.ts      # URL parsing
├── date-helpers.ts     # Date formatting
├── category-mapping.ts # Category validation
└── ...
```

### Components (Feature folders)

```text
components/
├── ui/
│   ├── filters/        # Filter components
│   ├── events/         # Event cards, lists
│   ├── forms/          # Form components
│   └── ...
├── hooks/              # Custom hooks (useXxx)
└── partials/           # Layout partials
```

---

## ✅ Verification Checklist (Before PR)

- [ ] Searched for existing patterns using grep/semantic_search
- [ ] Reported findings before implementing
- [ ] All types defined in `/types` directory
- [ ] No inline type definitions in components
- [ ] Constants imported from `utils/constants.ts`
- [ ] Reused existing utilities where possible
- [ ] No helper functions used only once
- [ ] **No barrel files (`index.ts`) re-exporting `"use client"` components from different routes**
- [ ] All component imports use direct file paths (not barrel re-exports)
- [ ] Followed canonical location for new files
- [ ] Ran `yarn typecheck && yarn lint && yarn test`

---

## 🔧 Quick Search Commands

```bash
# Find existing types
grep -r "interface\|type " types/ --include="*.ts"

# Find existing hooks
ls components/hooks/

# Find existing utilities
ls utils/

# Find constants
grep -r "export const" utils/constants.ts

# Find validation functions
grep -r "isValid\|validate" utils/ --include="*.ts"

# Find formatters
grep -r "format\|Format" utils/ --include="*.ts"
```

---

**Remember**: 5 minutes of searching saves 30 minutes of refactoring.

**Last Updated**: January 15, 2026
