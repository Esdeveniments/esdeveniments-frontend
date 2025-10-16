# Reference Data

## Lookup Tables & Component Inventory

**Purpose**: Pure data for migration reference  
**Status**: ✅ Ready to use

---

## 📊 Contents

1. [Gray-to-Semantic Color Mapping](#gray-to-semantic-color-mapping) (112 instances)
2. [Component Migration Inventory](#component-migration-inventory) (88 components)

---

## Gray-to-Semantic Color Mapping

**Total Instances**: 112 (77 in `components/`, 35 in `app/`)  
**Goal**: Replace all generic Tailwind grays with semantic color tokens by Week 3
**Enforcement**: Do not disable Tailwind `gray` palette. Enforce via CI/lint.

### Mapping Table

| Current Class     | Semantic Replacement     | Context / Notes                            |
| ----------------- | ------------------------ | ------------------------------------------ |
| `text-gray-900`   | `text-foreground-strong` | Headings, high emphasis text               |
| `text-gray-800`   | `text-foreground`        | Primary body text, strong labels           |
| `text-gray-700`   | `text-foreground`        | Body text, default text color              |
| `text-gray-600`   | `text-foreground/80`     | Secondary text, muted descriptions         |
| `text-gray-500`   | `text-foreground/70`     | Tertiary text, placeholders                |
| `text-gray-400`   | `text-foreground/60`     | Disabled text, icons                       |
| `text-gray-300`   | `text-foreground/40`     | Dividers, very subtle elements             |
| `bg-gray-50`      | `bg-muted`               | Subtle backgrounds, light card backgrounds |
| `bg-gray-100`     | `bg-muted`               | Input backgrounds, skeleton loaders        |
| `bg-gray-200`     | `bg-border/40`           | Skeleton loaders (medium)                  |
| `border-gray-100` | `border-border/30`       | Very subtle borders                        |
| `border-gray-200` | `border-border`          | Default borders, card borders              |
| `border-gray-300` | `border-border`          | Input borders, stronger dividers           |

#### Additional Notes

- Prefer `text-foreground-strong` for headings/high emphasis; otherwise `text-foreground`.
- For muted text, use opacity suffixes on `foreground` rather than lighter `gray-*`.
- Borders: default to `border-border`; use opacity variants (e.g., `border-border/30`) for subtle dividers.

### High Priority Files (Week 3 Days 1-2)

**Approach**: Migrate per file (not bulk find/replace). Visual validation after each change.

1. **RestaurantPromotionForm.tsx** (21 instances)

   - `text-gray-600` → `text-foreground/80`
   - `text-gray-700` → `text-foreground`
   - `text-gray-500` → `text-foreground/70`
   - `bg-gray-200` → `bg-border/40`
   - `border-gray-300` → `border-border`
   - `bg-gray-50` → `bg-muted`

2. **WhereToEatSection.tsx** (12 instances)

   - `border-gray-200` → `border-border`
   - `bg-gray-100` → `bg-muted`
   - `text-gray-400` → `text-foreground/60`
   - `text-gray-900` → `text-foreground-strong`
   - `text-gray-600` → `text-foreground/80`
   - `text-gray-700` → `text-foreground`

3. **locationDiscoveryWidget/index.tsx** (11 instances)

   - `border-gray-200` → `border-border`
   - `bg-gray-200` → `bg-border/40`
   - `text-gray-400` → `text-foreground/60`
   - `bg-gray-50` → `bg-muted`
   - `text-gray-700` → `text-foreground`

4. **WhereToEatSkeleton.tsx** (8 instances)

   - `border-gray-200` → `border-border`
   - `bg-gray-200` → `bg-border/40`
   - `text-gray-400` → `text-foreground/60`

5. **Sitemap Pages** (30 instances across 3 files)
   - `app/sitemap/page.tsx` (10 instances)
   - `app/sitemap/[town]/page.tsx` (10 instances)
   - `app/sitemap/[town]/[year]/[month]/page.tsx` (10 instances)

### Progress Tracking Commands

```bash
# Count remaining generic grays (target: 0)
grep -rE 'text-gray-|bg-gray-|border-gray-' components/ app/ | wc -l

# Count semantic class usage (should increase)
grep -rE 'heading-|body-|btn-|card-|badge-|flex-center|stack|container-(page|article|form)' components/ app/ | wc -l

# Detect new violations (CI grep-friendly)
# Week 3+: error only on changed files (example with git diff against main)
if git diff --name-only origin/main...HEAD | grep -E '^(components/|app/).*\.(tsx|ts)$' | xargs -I {} grep -nE "text-gray-|bg-gray-|border-gray-" {} ; then
  echo "Found gray violations in changed files" && exit 1; fi

# Week 7+: repo-wide enforcement
if [ "$ENFORCE_NO_GRAY_REPO_WIDE" = "1" ]; then
  if grep -R --line-number -E "text-gray-|bg-gray-|border-gray-" components/ app/; then
    echo "Found gray violations" && exit 1; fi
fi
```

### Per-Component Migration Checklist (Template)

- [ ] Typography migrated (`.heading-*`, `.body-*`)
- [ ] Colors migrated (no `gray-*`; semantic tokens only)
- [ ] Buttons standardized (`<Button variant>` or `.btn-*`)
- [ ] Cards standardized (`.card-*`)
- [ ] Layout utilities used (`.flex-*`, `.stack`, containers: `.container-page|article|form`)
- [ ] Line clamping applied where needed (titles/descriptions)
- [ ] Form input states covered (default/hover/focus/error/disabled/readonly)
- [ ] Focus-visible patterns used (`.focus-ring`)
- [ ] Tests pass (TS, unit, e2e)
- [ ] Visual QA completed (Playwright screenshots)

---

## Component Migration Inventory

**Total Components**: 88 TypeScript/TSX files in `components/ui/`  
**Priority**: Based on usage + alignment + complexity + gray instances

---

### Ownership & Whitelisting

- If mapping is unclear for a specific context, create a short PR updating this table before coding.
- For rare legacy cases that must persist temporarily, add a comment with rationale and a TODO linking to an issue.

### Week 2: Typography Focus (10 Components)

**Target**: Migrate typography to semantic classes

1. `components/ui/common/navbar/index.tsx`
2. `components/ui/common/footer/index.tsx`
3. `components/ui/filters/ServerFilters.tsx`
4. `components/ui/filters/FilterButton.tsx`
5. `components/ui/common/link/ServerNavLink.tsx`
6. `components/ui/common/link/index.tsx`
7. `components/ui/layout/base/index.tsx`
8. `components/ui/clientInteractiveLayer/index.tsx`
9. `components/ui/common/loading/index.tsx`
10. `components/ui/common/noEventsFound/index.tsx`

### Week 3: Color System Cleanup (24 Components)

**Target**: Replace all generic grays with semantic colors

**High Gray Count (≥ 8):**

1. `components/ui/restaurantPromotion/RestaurantPromotionForm.tsx` (21)
2. `components/ui/restaurantPromotion/WhereToEatSection.tsx` (12)
3. `components/ui/locationDiscoveryWidget/index.tsx` (11)
4. `app/sitemap/[town]/[year]/[month]/page.tsx` (11)
5. `app/sitemap/[town]/page.tsx` (9)
6. `app/sitemap/page.tsx` (8)
7. `components/ui/restaurantPromotion/WhereToEatSkeleton.tsx` (8)

**Medium Gray Count (3–5):**

1. `components/ui/restaurantPromotion/CloudinaryUploadWidget.tsx` (4)
2. `components/ui/common/form/textarea/index.tsx` (4)
3. `components/ui/cardHorizontal/CardHorizontalServer.tsx` (3)
4. `components/ui/restaurantPromotion/PromotedRestaurantCard.tsx` (3)
5. `app/offline/page.tsx` (5)

**Low Gray Count (1–2):**

1. `components/ui/locationDiscoveryWidget/LocationDropdown.tsx` (1)
2. `components/ui/filters/FilterButton.tsx` (1)
3. `components/ui/eventsAround/EventsAroundServer.tsx` (1)
4. `components/ui/common/notification/index.tsx` (1)
5. `components/ui/common/staticShareButtons/index.tsx` (1)
6. `components/ui/common/form/select/index.tsx` (1)
7. `components/ui/common/form/multiSelect/index.tsx` (1)
8. `components/ui/EventForm/index.tsx` (1)
9. `components/ui/restaurantPromotion/PromotionInfoModal.tsx` (1)
10. `components/ui/viewCounter/ViewCounterIsland.tsx` (2)
11. `app/e/[eventId]/components/EventDescription.tsx` (1)
12. `app/e/[eventId]/components/EventTags.tsx` (1)

### Week 4: Button & Card Standardization (20 Components)

**Target**: Replace custom button/card patterns

1. `components/ui/loadMoreButton/index.tsx`
2. `components/ui/common/nativeShareButton/index.tsx`
3. `components/ui/common/cardShareButton/index.tsx`
4. `components/ui/common/modal/index.tsx`
5. `components/ui/filtersModal/NavigationFiltersModal.tsx`
6. `components/ui/filtersModal/index.tsx`
7. `components/ui/newsCard/index.tsx`
8. `components/ui/newsRichCard/index.tsx`
9. `components/ui/newsHeroEvent/index.tsx`
10. `components/ui/card/index.tsx`
11. `components/ui/card/AdCardClient.tsx`
12. `components/ui/adCard/index.tsx`
13. `components/ui/cardLoading/index.tsx`
14. `components/ui/common/cardContent/index.tsx`
15. `components/ui/common/cardContent/CardContentServer.tsx`
16. `components/ui/common/cardContent/DesktopShareIsland.tsx`
17. `components/ui/common/cardContent/MobileShareIsland.tsx`
18. `components/ui/addToCalendar/CalendarButton.tsx`
19. `components/ui/addToCalendar/AddToCalendar.tsx`
20. `components/ui/addToCalendar/CalendarList.tsx`

### Week 5: Layout & Polish (20 Components)

**Target**: Replace repetitive flex patterns

1. `components/ui/common/form/input/index.tsx`
2. `components/ui/common/form/radioInput/index.tsx`
3. `components/ui/common/image/index.tsx`
4. `components/ui/common/image/ImageServer.tsx`
5. `components/ui/common/image/ClientImage.tsx`
6. `components/ui/common/social/index.tsx`
7. `components/ui/common/form/imageUpload/index.tsx`
8. `components/ui/common/form/datePicker/index.tsx`
9. `components/ui/common/form/rangeInput/index.tsx`
10. `components/ui/common/culturalMessage/index.tsx`
11. `components/ui/common/description/index.tsx`
12. `components/ui/common/videoDisplay/index.tsx`
13. `components/ui/eventsAround/EventsAroundSection.tsx`
14. `components/ui/hybridEventsList/index.tsx`
15. `components/ui/hybridEventsList/HybridEventsListClient.tsx`
16. `components/ui/imgDefault/index.tsx`
17. `components/ui/imgDefault/ImgDefaultCore.tsx`
18. `components/ui/imgDefault/ImgDefaultServer.tsx`
19. `components/ui/list/index.tsx`
20. `components/ui/weather/index.tsx`

### Week 6: Documentation & Long Tail (13 Components)

**Target**: Migrate remaining low-priority components

1. `components/ui/adBoard/index.tsx`
2. `components/ui/adArticle/index.tsx`
3. `components/ui/GoogleAdsense/index.tsx`
4. `components/ui/maps/index.tsx`
5. `components/ui/reportView/index.tsx`
6. `components/ui/serverEventsCategorized/index.tsx`
7. `components/ui/common/shareIslandSkeleton/index.tsx`
8. `components/ui/tooltip/index.tsx`
9. `components/ui/viewCounter/index.tsx`
10. `components/ui/filters/FilterErrorBoundary.tsx`
11. `components/ui/newsCta/index.tsx`
12. `components/ui/restaurantPromotion/index.tsx`
13. `components/ui/restaurantPromotion/RestaurantPromotionSection.tsx`

### Already Aligned / Planned Adaptation

- `components/ui/common/button/index.tsx` - Planned adaptation in Week 4 to use semantic classes; until then use `.btn-*` classes
- `components/ui/common/badge/index.tsx` - Planned adaptation in Week 4; until then use `.badge-*` classes
- Image components - Minimal styling, no significant changes needed

---

**For detailed design system overview, see**: `design-system-overview.md.md`  
**For all code needed, see**: `implementation-reference.md`
