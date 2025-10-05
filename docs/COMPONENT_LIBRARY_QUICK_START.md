# Component Library - Quick Start Guide

This guide helps you get started with the Component Library Extraction project.

## Prerequisites

- Node.js 18+
- Yarn package manager
- Basic understanding of the codebase structure

## Getting Started

### 1. Install Dependencies

The required utilities are already installed:

- ✅ `clsx` - Conditional className utility
- ✅ `tailwind-merge` - Tailwind conflict resolution

### 2. Run Initial Analysis

```bash
# Run all analyses
node scripts/component-analysis/run-all.mjs

# Or run individually
node scripts/component-analysis/analyze-components.mjs
node scripts/component-analysis/analyze-tailwind-patterns.mjs
node scripts/component-analysis/find-duplicates.mjs
```

This will generate reports in `scripts/component-analysis/output/`:

- `component-inventory.csv` - Spreadsheet of all components
- `component-summary.json` - High-level statistics
- `tailwind-patterns.json` - CSS usage analysis
- `duplicate-analysis.json` - Consolidation opportunities

### 3. Review the Reports

Open the generated reports and identify:

- **High priority components**: Used 10+ times (4 components: image, link, Card, Button)
- **Consolidation opportunities**: 12 potential duplicates identified for consolidation
- **Design system violations**: 112 color violations, 158 spacing violations, 216 typography violations
- **Component architecture**: 80 components analyzed and extracted, 100% architecture compliance

### 4. Plan Your First Sprint

Based on the analysis, choose 2-3 high-priority components to extract first. Good candidates:

- **Button** - Likely high usage, already well-structured
- **Input** - Common form primitive
- **Badge** - Simple display component

## Using the cn() Utility

The `cn()` utility is ready to use for className composition:

```tsx
import { cn } from "@components/utils/cn";

// Basic usage
<div className={cn("px-4 py-2", "bg-primary")} />

// Conditional classes
<div className={cn(
  "px-4 py-2",
  isActive && "bg-primary",
  !isActive && "bg-gray-200"
)} />

// Resolves Tailwind conflicts
<div className={cn("px-2", "px-4")} />
// => "px-4" (later value wins)

// In a component with variants
const Button = ({ variant, className }) => (
  <button className={cn(
    "px-4 py-2", // base
    VARIANTS[variant], // variant-specific
    className // user overrides
  )} />
);
```

## Project Structure

```
/Users/albertolive/Repos/que-fer/
├── COMPONENT_LIBRARY_PLAN.md          # Main tracking document
├── components/
│   ├── utils/
│   │   └── cn.ts                       # ✅ Ready to use
│   └── ui/
│       ├── common/                     # ⚠️ LEGACY - being phased out
│       ├── primitives/                 # ✅ ACTIVE - 25+ components extracted
│       ├── patterns/                   # ✅ ACTIVE - composed components
│       └── domain/                     # ✅ ACTIVE - business components
├── scripts/
│   └── component-analysis/             # ✅ Analysis tools
│       ├── analyze-components.mjs
│       ├── analyze-tailwind-patterns.mjs
│       ├── find-duplicates.mjs
│       ├── run-all.mjs
│       └── README.md
└── types/
    ├── ui/                             # ✅ ACTIVE - Component library types
    └── common.ts                       # Existing shared types
```

## Next Actions

1. ✅ **Phase 1 Complete**: Analysis scripts created and run (80 components analyzed)
2. ✅ **Phase 2 Complete**: Design system violations addressed (112 colors, 158 spacing, 216 typography)
3. ✅ **Phase 3 Complete**: Component consolidation and testing expansion completed (2025-10-04)
4. ✅ **Component Library Established**: 80+ components extracted to primitives/patterns/domain
5. 📝 **Ongoing**: Migrate remaining components from `common/` to new structure

## Common Commands

```bash
# Development
yarn dev                    # Start dev server
yarn build                  # Production build

# Quality checks
yarn typecheck              # TypeScript validation
yarn lint                   # ESLint
yarn test                   # Unit tests
yarn test:e2e               # E2E tests

# Analysis
node scripts/component-analysis/run-all.mjs

# Bundle analysis
yarn analyze                # Full bundle
yarn analyze:browser        # Browser only
yarn analyze:server         # Server only
```

## Getting Help

- **Main Plan**: See `COMPONENT_LIBRARY_PLAN.md` for complete roadmap
- **Analysis Guide**: See `scripts/component-analysis/README.md`
- **Type Organization**: See `types/README.md`
- **Project Conventions**: See `.github/copilot-instructions.md`

## Tips

1. **Start Small**: Extract 2-3 components at a time
2. **Test Continuously**: Run `yarn typecheck && yarn test` after each change
3. **Maintain Compatibility**: Keep old components during migration
4. **Document As You Go**: Add JSDoc comments and READMEs
5. **Follow Existing Patterns**: Use `Button` component as reference

## Troubleshooting

### Analysis Scripts Won't Run

```bash
# Make scripts executable
chmod +x scripts/component-analysis/*.mjs

# Or run with node explicitly
node scripts/component-analysis/run-all.mjs
```

### Type Errors After Adding cn()

The utility should work immediately. If you see errors:

```bash
yarn typecheck
```

### Import Errors

Make sure you're using the correct path alias:

```tsx
import { cn } from "@components/utils/cn";
// NOT: import { cn } from "components/utils/cn";
```

## Support

For questions or issues:

1. Check the relevant README files
2. Review `.github/copilot-instructions.md` for project conventions
3. Consult the full plan in `COMPONENT_LIBRARY_PLAN.md`

---

**Ready to start?** Run the analysis scripts and review the reports!
