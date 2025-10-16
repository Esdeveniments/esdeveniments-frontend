# Design System Overview

## Project: esdeveniments.cat

**Status**: ✅ Ready for Implementation  
**Estimated Effort**: 7 weeks (1 week pre-flight + 6 weeks implementation)  
**Approach**: AI-driven batch workflow with manual verification

---

## 🎯 Executive Summary

This project standardizes the Tailwind CSS implementation across 88 UI components to achieve:

- **Code consistency** - Unified semantic classes replace scattered inline utilities
- **Visual polish** - Professional shadows, spacing, and transitions (Eventbrite-level quality)
- **Maintainability** - Update design system values in one place, applies everywhere
- **Developer velocity** - Semantic classes are faster to write and easier to understand

**Key Achievement**: Transform codebase from **C+ visual quality** to **A-level professional design** while establishing clean, maintainable code patterns.

---

## ❌ Current Problems

### 1. Typography Chaos (80+ inconsistent patterns)

- `h1` ranges from `text-2xl` to `text-5xl`
- `h2` ranges from `text-lg` to `text-3xl`
- No semantic mapping between HTML tags and Tailwind classes
- Every developer interprets heading sizes differently

### 2. Color System Inconsistency (112 generic gray instances)

- `text-gray-600/700/800/900` instead of semantic `text-foreground`
- `bg-gray-50/100/200` instead of `bg-muted`
- `border-gray-100/200/300` instead of `border-border`
- Visual hierarchy at risk during refactors

### 3. Button Patterns (8 different implementations)

- Inconsistent padding: `py-2`, `py-3`, custom values
- Inconsistent borders: `border` vs `border-2`
- No standardized disabled states
- Hover effects vary wildly

### 4. Card Patterns (5 different variations)

- Some use `border + shadow`, others just `border` or just `shadow`
- Padding ranges from `p-4` to `p-8`
- Border radius inconsistent: `rounded-lg`, `rounded-xl`, custom

### 5. Shadow System (Almost Non-Existent)

- **Only 1 custom shadow** defined: `boxShadow.lg: "4px 4px 9px -3px #45454590"`
- Dated appearance (looks like 2015)
- No depth hierarchy
- Missing hover elevations

### 6. Spacing & Layout (No Semantic System)

- Magic numbers everywhere: `p-4`, `p-6`, `gap-2`, `gap-4`
- Repetitive patterns: `flex justify-center items-center` appears 90+ times
- No responsive spacing strategy

### 7. Transitions (No Consistency)

- Mix of `transition-all`, `transition-colors`, `transition-shadow`
- Inconsistent timing: default 150ms, `duration-200`, `duration-300`
- No standardized hover/focus states

---

## ✅ Solution Approach

### Semantic Class System

Replace descriptive Tailwind utilities with semantic, reusable classes:

**Before:**

```tsx
<h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight font-barlow uppercase italic">
  Event Title
</h1>
```

**After:**

```tsx
<h1 className="heading-1">Event Title</h1>
```

### Professional Design Tokens (Quick Wins)

Upgrade design system values to modern, professional standards:

| Aspect            | Current        | After Quick Wins                              |
| ----------------- | -------------- | --------------------------------------------- |
| **Shadows**       | 1 dated shadow | 7-level professional system                   |
| **Spacing**       | Random values  | 10 semantic tokens                            |
| **Transitions**   | Inconsistent   | Professional timing system                    |
| **Border Radius** | Mixed          | 5 semantic tokens                             |
| **Colors**        | Basic palette  | + Validation colors (success, error, warning) |

### Component Patterns

Standardize button, card, badge, and layout patterns:

- **Buttons**: Existing `<Button>` component will be adapted to use semantic classes in Week 4; until then use `.btn-*` classes
- **Cards**: `.card-bordered`, `.card-elevated`, `.card-body`
- **Badges**: `.badge-default`, `.badge-primary` (existing `<Badge>` component adapted in Week 4; until then use `.badge-*` classes)
- **Layout**: `.flex-center`, `.stack`, `.flex-between`, `.container-page`, `.container-article`, `.container-form`
- **Color tokens**: `background`, `foreground`, `foreground-strong`, `muted`, `border`, `primary-foreground` (legacy aliases exist during migration only)

### Deprecation & Adoption Policy

- During migration: legacy utilities permitted; semantic tokens/classes preferred.
- Week 7: remove legacy aliases no longer referenced; ensure 0 `gray-*` usages remain.
- Enforcement approach: do not disable Tailwind `gray` palette; enforce via CI/lint rules.

### Adoption Timeline & Guardrails

- Week 1: Tokens + semantic classes available; use `.btn-*` classes (component adaptation lands Week 4); CI allows legacy usage.
- Week 3: Error on `gray-*` in changed files; warn on repetitive flex patterns.
- Week 5: Enforce semantic buttons/cards in changed files.
- Week 7: Repo-wide enforcement; PR to remove legacy aliases.

---

## 📊 Visual Quality Improvement

### Before/After Grades

| Aspect                 | Before Migration      | After Migration + Quick Wins |
| ---------------------- | --------------------- | ---------------------------- |
| **Code Consistency**   | D (many patterns)     | **A** ✅                     |
| **Visual Harmony**     | C+ (decent but dated) | **A** ✅                     |
| **Shadow Depth**       | D (almost none)       | **A** ✅                     |
| **Spacing Rhythm**     | C (inconsistent)      | **A** ✅                     |
| **Interactions**       | C (basic)             | **A** ✅                     |
| **Border Consistency** | B- (mixed)            | **A** ✅                     |
| **Color System**       | B (functional)        | **A** ✅                     |
| **Typography**         | B+ (good base)        | **A** ✅                     |
| **Overall Grade**      | **C+**                | **A** 🎯                     |

**Result**: Eventbrite-level professional design quality ✅

---

## 🗓️ 7-Week Timeline

### Week 0: Pre-Flight (5-8 hours)

- Establish baseline metrics:

  - Run: `yarn test && yarn typecheck` (record pass/fail, timing)
  - Build CSS: `yarn build`, measure bundle size of `.next/static/css/`
  - Gray count baseline: `grep -rE 'text-gray-|bg-gray-|border-gray-' components/ app/ | wc -l` (expect: 112)

- Record Playwright visual regression baselines (10 key pages):

  - Command: `yarn test:e2e` (existing suite or create baseline baseline recording)
  - Pages to baseline: homepage, event-detail (any event), event-list (by category), event-list (by place), filters-page, news-list, news-detail, search-results, offline-page, error-page
  - Storage: playwright-report/ directory (CI compares future runs against these)

- Review documentation with team (read all 4 docs in docs/)
- Set up AI agent config for batch workflow

### Week 1: Foundation + Quick Wins (8-12 hours)

✅ **COMPLETED**

- ✅ Quick Wins: Added professional shadows, spacing, transitions, border radius, colors
- ✅ Updated `tailwind.config.js` with complete design tokens
- ✅ Added semantic classes to `globals.css` (typography, buttons, cards, badges, layout, forms, shadows, transitions)
- ✅ All tests passing, build verified, no regressions

### Week 2: Typography (10 components, ~20 hours)

✅ **COMPLETED**

✅ Completed (Phase 1):

- HybridEventsList: h1 (`.heading-1`) + subtitle (`.body-large`)
- Footer: Navigation links + copyright (`.label`)
- News Article page: h1 (`.heading-1`) + subtitle (`.body-large`)
- Link components: ActiveLink + ServerNavLink (`.label`)

✅ Completed (Phase 2):

- NewsCard: h2/h3 (`.heading-1`/`.heading-3`) + description (`.body-small`)
- NewsRichCard: h3 (`.heading-2`/`.heading-3`) + description (`.body-normal`/`.body-small`)
- CardContent: h3 (`.heading-4`) + metadata (`.body-small`)

✅ Completed (Phase 3):

- EventHeader: h1 (`.heading-3`)
- EventDetailsSection: h2 (`.heading-3`) + info (`.body-small`/`.body-normal`)
- Description: h2 (`.heading-3`) + content (`.body-normal`)

**Result**: 14 components, 50+ typography utilities migrated to semantic classes

### Week 3: Colors (25 components, ~30 hours)

✅ **COMPLETED - 100% of gray instances migrated**

✅ Batch 1 (High Priority - 52 instances):

- RestaurantPromotionForm.tsx, WhereToEatSection.tsx, locationDiscoveryWidget, WhereToEatSkeleton.tsx

✅ Batch 2 (Sitemap Pages - 25 instances):

- app/sitemap/page.tsx, [town]/page.tsx, [town]/[year]/[month]/page.tsx

✅ Batch 3 (Remaining Files - 35 instances):

- PromotedRestaurantCard, form components, CardHorizontalServer, notification, EventForm, ViewCounter, modals, upload widgets, buttons, event components
- Total Progress: 112/112 gray instances migrated (100% complete) ✅

### Week 4: Buttons & Cards (20 components, ~25 hours)

✅ **COMPLETED - 28 button/badge/card patterns migrated**

✅ Batch 1 (Cards & Badges - 16 patterns):

- newsCard.tsx, newsRichCard.tsx fully converted
- All variants use .card-elevated, .btn-primary, .badge-primary, .badge-default

✅ Batch 2 (Hero & Buttons - 8 patterns):

- newsHeroEvent.tsx, loadMoreButton.tsx → semantic classes

✅ Batch 3 (Additional Patterns - 4 instances):

- PromotedRestaurantCard: badge → .badge-primary
- RestaurantPromotionForm: submit button → .btn-primary

🔄 Left As-Is (Custom Components - 5+ components):

- Modal buttons, EditModal, ImageUpload, NewsCta, ServerEventsCategorized (specialized styling)

### Week 5: Layout & Polish (20 components, ~25 hours)

- Replace repetitive flex patterns with semantic utilities
- Refactor medium-priority components
- Apply spacing and transition improvements

### Week 6: Long Tail & Final (13 components, ~20 hours)

- Migrate remaining low-priority components
- Full E2E test suite validation
- Bundle size comparison
- Team training

### Week 7 Post-Migration: Cleanup (4 hours)

- Verify 0 generic gray instances remain
- Remove deprecated color aliases (PR: "design-system: remove legacy aliases")
- Final documentation updates
- Production deployment

**Total Estimated Effort**: ~140 hours (1 developer, 7 weeks part-time)

---

## 🎯 Success Criteria

### Technical Metrics

- ✅ 88/88 components migrated
- ✅ 0 generic gray classes (`text-gray-*`, `bg-gray-*`, `border-gray-*`)
- ✅ All tests passing (TypeScript, lint, unit, E2E)
- ✅ Build succeeds with no errors
- ✅ CSS bundle size within 5% of baseline

### Code Quality Metrics

- ✅ 95%+ components use semantic classes
- ✅ 30% reduction in className length
- ✅ Unified button/card/badge patterns
- ✅ Consistent typography across all components

### Visual Quality Metrics

- ✅ Professional shadow depth system
- ✅ Harmonious spacing rhythm
- ✅ Smooth, polished transitions
- ✅ Consistent border radius
- ✅ No visual regressions (screenshot comparison)

### Team Adoption Metrics

- ✅ AI agent auto-enforces design system (Section 20 of copilot-instructions.md)
- ✅ Team trained on semantic classes
- ✅ Documentation complete and accessible
- ✅ New components follow design system patterns

---

## 🤖 Implementation Approach

### AI-Driven Batch Workflow

**Process**: AI implements → User verifies → Iterate

**Batch Size**: 1-3 components per batch
**Verification**: After every batch (tests + visual QA)
**Testing**: Playwright E2E + TypeScript after each batch

**Example Batch:**

1. AI migrates 2 components
2. AI runs tests, provides output
3. User reviews changes, checks browser
4. User approves or requests adjustments
5. Repeat for next batch

**Advantages:**

- ✅ Small, verifiable changes
- ✅ Early error detection
- ✅ Continuous manual QA
- ✅ Easy rollback if needed
- ✅ No "big bang" deployment

---

## 📚 Documentation Structure

All implementation details are in **separate, focused documents**:

1. **`implementation-reference.md`** - Complete `tailwind.config.js`, `globals.css`, class reference
2. **`reference-data.md`** - Gray mapping table (112 instances), component inventory (88 components)

**This document** provides the **WHAT and WHY**. See other docs for **HOW**.

---

## ⚠️ Risks & Mitigation

### Risk 1: Visual Regressions

**Mitigation:**

- Screenshot comparison (Week 0 baseline)
- Playwright E2E tests after every batch
- Manual QA on 3-5 pages per batch
- Small batch sizes (1-3 components)

### Risk 2: Test Failures

**Mitigation:**

- Existing tests must pass (baseline)
- Update brittle tests (className checks)
- TypeScript check after every batch

### Risk 3: Production Hotfixes During Migration

**Mitigation:**

- Hotfix on main branch (old code)
- Deploy immediately
- Cherry-pick to migration branch
- Continue migration

### Risk 4: Team Confusion (Old vs New Patterns)

**Mitigation:**

- AI agent enforces new patterns automatically
- Quick reference guide available
- Training session in Week 6
- Code review checklist

---

## 💰 Cost/Benefit Analysis

### Investment

- **Time**: 140 hours (~7 weeks, 1 developer part-time)
- **Week 1 Quick Wins**: 3 hours (shadow/spacing/transitions)
- **Risk**: Low (batch workflow, comprehensive testing)

### Benefits

**Immediate (Week 1):**

- ✅ Professional shadows, spacing, transitions
- ✅ Validation colors (success, error, warning)
- ✅ Visual quality: C+ → B+

**Short-term (Week 7):**

- ✅ Code consistency: D → A
- ✅ Visual quality: B+ → A
- ✅ 30% less code per component
- ✅ Unified patterns (buttons, cards, badges)

**Long-term (Ongoing):**

- ✅ Faster feature development (semantic classes)
- ✅ Easier design updates (change tokens once)
- ✅ Better onboarding (clear patterns)
- ✅ AI agent auto-enforces consistency
- ✅ Reduced tech debt
- ✅ Professional, modern appearance

**ROI**: Investment pays back in ~3 months (faster development + easier maintenance)

---

## 🎯 Expected Outcomes

### After Week 1 (Foundation + Quick Wins)

- ✅ Design tokens configured
- ✅ Semantic classes available
- ✅ Professional shadows, spacing, transitions added
- ✅ New components can use design system immediately
- ✅ Visual quality: C+ → B+

### After Week 7 (Full Migration)

- ✅ 88/88 components migrated
- ✅ 0 generic gray classes
- ✅ All tests passing
- ✅ Visual quality: A-level
- ✅ Code consistency: A-level
- ✅ Professional, modern design

### Long-Term (6+ Months)

- ✅ Team fluent in semantic classes
- ✅ New features follow design system automatically
- ✅ Design updates take minutes, not days
- ✅ Codebase maintainable and scalable
- ✅ Modern, professional appearance maintained

---

## ❓ FAQ

### Q: Why not just use Tailwind defaults?

**A**: Project has custom brand colors (primary red `#FF0037`), custom fonts (Barlow, Roboto), and specific design language. Generic Tailwind doesn't capture these patterns.

### Q: Why semantic classes instead of inline Tailwind?

**A**:

- Faster to write (`.heading-1` vs 8 utility classes)
- Easier to maintain (update once, applies everywhere)
- Clearer intent (semantic meaning vs descriptive styles)
- Consistent application (fewer bugs)

### Q: Will this break existing components?

**A**: No. Changes are additive (new semantic classes). Old Tailwind utilities still work. Migration is gradual (batch-by-batch).

### Q: What if we need to hotfix during migration?

**A**: Hotfix on main branch (old code), deploy, then cherry-pick to migration branch. No blocking issues.

### Q: How do we prevent regression after migration?

**A**: AI agent auto-enforces design system rules (Section 20 of copilot-instructions.md). New code automatically follows patterns.

### Q: What if tests fail?

**A**: Small batches mean easy rollback. AI identifies issue, proposes fix, user approves. Iterate until tests pass.

### Q: Can we skip Quick Wins?

**A**: Technically yes, but not recommended. Quick Wins transform visual quality (C+ → A) with only 3 hours of work in Week 1.

---

## 🚀 Next Steps

**Ready to start?**

1. **Read**: `implementation-reference.md` (complete code for Week 1)
2. **Execute**: Week 0 pre-flight checklist
3. **Execute**: Week 1 Quick Wins + foundation setup

**Questions?** See `README.md` for document navigation.

---

**Status**: ✅ Ready for implementation  
**Last Updated**: October 2025
