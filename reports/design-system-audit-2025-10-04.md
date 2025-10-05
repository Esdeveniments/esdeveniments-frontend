# Design System Audit Report - Saturday, October 4, 2025

## Executive Summary

- **Files Scanned**: 401
- **Total Violations**: 0
- **Audit Date**: 2025-10-04T09:04:19.094Z

## Violation Breakdown

### 🎨 Hardcoded Colors (112)

| File | Line | Violation |
|------|------|-----------|
| `components/ui/primitives/Select/Select.tsx` | 8 | `#CCC` |
| `components/ui/primitives/Select/Select.tsx` | 13 | `#FFF` |
| `components/ui/primitives/Select/Select.tsx` | 24 | `#000` |
| `components/ui/primitives/Select/Select.tsx` | 24 | `#CCC` |
| `components/ui/primitives/Select/Select.tsx` | 30 | `#CCC` |
| `components/ui/primitives/Select/Select.tsx` | 36 | `#FF0037` |
| `components/ui/primitives/Select/Select.tsx` | 36 | `#FFF` |
| `components/ui/primitives/Select/Select.tsx` | 37 | `#FFF` |
| `components/ui/primitives/Select/Select.tsx` | 37 | `#454545` |
| `components/ui/primitives/Select/Select.tsx` | 42 | `#454545` |
| `components/ui/primitives/Select/Select.tsx` | 48 | `#454545` |
| `components/ui/primitives/Select/Select.tsx` | 49 | `#FFF` |
| `components/ui/primitives/MultiSelect/MultiSelect.tsx` | 12 | `#CCC` |
| `components/ui/primitives/MultiSelect/MultiSelect.tsx` | 17 | `#FFF` |
| `components/ui/primitives/MultiSelect/MultiSelect.tsx` | 28 | `#000` |
| `components/ui/primitives/MultiSelect/MultiSelect.tsx` | 28 | `#CCC` |
| `components/ui/primitives/MultiSelect/MultiSelect.tsx` | 34 | `#CCC` |
| `components/ui/primitives/MultiSelect/MultiSelect.tsx` | 40 | `#FF0037` |
| `components/ui/primitives/MultiSelect/MultiSelect.tsx` | 40 | `#FFF` |
| `components/ui/primitives/MultiSelect/MultiSelect.tsx` | 41 | `#FFF` |

*... and 92 more violations*


### 📏 Hardcoded Spacing (158)

| File | Line | Violation |
|------|------|-----------|
| `types/ui/spacing.ts` | 4 | `mt-1` |
| `types/ui/spacing.ts` | 4 | `py-1` |
| `types/ui/spacing.ts` | 4 | `p-1` |
| `types/ui/spacing.ts` | 44 | `mt-1` |
| `types/ui/spacing.ts` | 45 | `px-0` |
| `types/ui/spacing.ts` | 45 | `px-0` |
| `types/ui/spacing.ts` | 46 | `py-1` |
| `types/ui/spacing.ts` | 47 | `p-1` |
| `types/ui/spacing.ts` | 48 | `mb-1` |
| `types/ui/spacing.ts` | 49 | `ml-1` |
| `types/ui/spacing.ts` | 50 | `my-1` |
| `types/ui/spacing.ts` | 51 | `pb-14` |
| `types/ui/spacing.ts` | 52 | `mb-10` |
| `types/ui/spacing.ts` | 53 | `pt-1` |
| `types/ui/spacing.ts` | 54 | `mx-1` |
| `types/ui/spacing.ts` | 55 | `m-0` |
| `types/ui/spacing.ts` | 55 | `m-0` |
| `types/ui/spacing.ts` | 56 | `mb-5` |
| `types/ui/spacing.ts` | 57 | `mb-0` |
| `types/ui/spacing.ts` | 57 | `mb-0` |

*... and 138 more violations*


### 📝 Hardcoded Typography (216)

| File | Line | Violation |
|------|------|-----------|
| `scripts/migrate-text-classes.js` | 12 | `text-xs` |
| `scripts/migrate-text-classes.js` | 14 | `text-xs` |
| `scripts/migrate-text-classes.js` | 21 | `text-sm` |
| `scripts/migrate-text-classes.js` | 23 | `text-sm` |
| `scripts/migrate-text-classes.js` | 30 | `text-base` |
| `scripts/migrate-text-classes.js` | 32 | `text-base` |
| `scripts/migrate-text-classes.js` | 39 | `text-lg` |
| `scripts/migrate-text-classes.js` | 41 | `text-lg` |
| `scripts/migrate-text-classes.js` | 48 | `text-base` |
| `scripts/migrate-text-classes.js` | 50 | `text-base` |
| `scripts/migrate-text-classes.js` | 57 | `text-lg` |
| `scripts/migrate-text-classes.js` | 59 | `text-lg` |
| `scripts/migrate-text-classes.js` | 71 | `text-sm` |
| `scripts/migrate-text-classes.js` | 80 | `text-sm` |
| `scripts/migrate-text-classes.js` | 89 | `text-sm` |
| `scripts/generate-weekly-audit-report.js` | 183 | `text-2xl` |
| `scripts/generate-weekly-audit-report.js` | 184 | `text-base` |
| `scripts/generate-weekly-audit-report.js` | 183 | `font-bold` |
| `scripts/design-system-audit.js` | 374 | `text-2xl` |
| `scripts/design-system-audit.js` | 377 | `text-base` |

*... and 196 more violations*


### 🧩 Component Violations (87)

| File | Line | Violation |
|------|------|-----------|
| `eslint-plugin-local.js` | 156 | `<p>` |
| `stories/Page.jsx` | 18 | `<h2>` |
| `stories/Page.jsx` | 19 | `<p>` |
| `stories/Page.jsx` | 26 | `<p>` |
| `stories/Page.jsx` | 41 | `<p>` |
| `stories/Page.jsx` | 56 | `<path
                d="M1.5 5.2h4.8c.3 0 .5.2.5.4v5.1c-.1.2-.3.3-.4.3H1.4a.5.5 0 01-.5-.4V5.7c0-.3.2-.5.5-.5zm0-2.1h6.9c.3 0 .5.2.5.4v7a.5.5 0 01-1 0V4H1.5a.5.5 0 010-1zm0-2.1h9c.3 0 .5.2.5.4v9.1a.5.5 0 01-1 0V2H1.5a.5.5 0 010-1zm4.3 5.2H2V10h3.8V6.2z"
                id="a"
                fill="#999"
              />` |
| `stories/Header.jsx` | 26 | `<h1>` |
| `stories/Header.jsx` | 12 | `<path
              d="M10 0h12a10 10 0 0110 10v12a10 10 0 01-10 10H10A10 10 0 010 22V10A10 10 0 0110 0z"
              fill="#FFF"
            />` |
| `stories/Header.jsx` | 16 | `<path
              d="M5.3 10.6l10.4 6v11.1l-10.4-6v-11zm11.4-6.2l9.7 5.5-9.7 5.6V4.4z"
              fill="#555AB9"
            />` |
| `stories/Header.jsx` | 20 | `<path
              d="M27.2 10.6v11.2l-10.5 6V16.5l10.5-6zM15.7 4.4v11L6 10l9.7-5.5z"
              fill="#91BAF8"
            />` |
| `scripts/migrate-text-classes.js` | 50 | `<p className="([^"]*?)text-base([^"]*?)">` |
| `scripts/migrate-text-classes.js` | 59 | `<p className="([^"]*?)text-lg([^"]*?)">` |
| `scripts/generate-weekly-audit-report.js` | 183 | `<h1 className="text-2xl font-bold">` |
| `scripts/generate-weekly-audit-report.js` | 184 | `<p className="text-base">` |
| `scripts/design-system-audit.js` | 374 | `<h1 className="text-2xl font-bold">` |
| `scripts/design-system-audit.js` | 95 | `<p[^>` |
| `scripts/design-system-audit.js` | 377 | `<p className="text-base">` |
| `components/ui/restaurantPromotion/WhereToEatSection.tsx` | 86 | `<path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />` |
| `components/ui/restaurantPromotion/WhereToEatSection.tsx` | 110 | `<path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />` |
| `components/ui/restaurantPromotion/WhereToEatSection.tsx` | 133 | `<span className="text-blackCorp/50">` |

*... and 67 more violations*


### 🔗 Missing Token Imports (103)

| File | Issue |
|------|-------|
| `test/text.test.tsx` | File uses Tailwind classes without importing design tokens |
| `test/link.test.tsx` | File uses Tailwind classes without importing design tokens |
| `test/card.test.tsx` | File uses Tailwind classes without importing design tokens |
| `stories/Page.jsx` | File uses Tailwind classes without importing design tokens |
| `scripts/generate-weekly-audit-report.js` | File uses Tailwind classes without importing design tokens |
| `scripts/design-system-audit.js` | File uses Tailwind classes without importing design tokens |
| `components/ui/weather/index.tsx` | File uses Tailwind classes without importing design tokens |
| `components/ui/viewCounter/index.tsx` | File uses Tailwind classes without importing design tokens |
| `components/ui/viewCounter/ViewCounterIsland.tsx` | File uses Tailwind classes without importing design tokens |
| `components/ui/serverEventsCategorized/index.tsx` | File uses Tailwind classes without importing design tokens |
| `components/ui/search/index.tsx` | File uses Tailwind classes without importing design tokens |
| `components/ui/restaurantPromotion/WhereToEatSection.tsx` | File uses Tailwind classes without importing design tokens |
| `components/ui/restaurantPromotion/RestaurantPromotionSection.tsx` | File uses Tailwind classes without importing design tokens |
| `components/ui/restaurantPromotion/RestaurantPromotionForm.tsx` | File uses Tailwind classes without importing design tokens |
| `components/ui/restaurantPromotion/PromotionInfoModal.tsx` | File uses Tailwind classes without importing design tokens |
| `components/ui/restaurantPromotion/PromotedRestaurantCard.tsx` | File uses Tailwind classes without importing design tokens |
| `components/ui/restaurantPromotion/CloudinaryUploadWidget.tsx` | File uses Tailwind classes without importing design tokens |
| `components/ui/primitives/ViewCounter/ViewCounter.tsx` | File uses Tailwind classes without importing design tokens |
| `components/ui/primitives/Textarea/Textarea.tsx` | File uses Tailwind classes without importing design tokens |
| `components/ui/primitives/Skeleton/Skeleton.tsx` | File uses Tailwind classes without importing design tokens |

*... and 83 more violations*


## Recommendations

### Quick Fixes

**For Hardcoded Colors:**
- Replace hardcoded colors with design tokens
- Use `text-blackCorp` instead of `text-gray-700`
- Use `bg-primary` instead of `bg-[#FF0037]`
- Use `border-bColor` instead of `border-gray-300`

**For Hardcoded Spacing:**
- Replace Tailwind spacing with design tokens
- Use `p-component-md` instead of `p-4`
- Use `m-component-sm` instead of `m-2`
- Use `gap-md` instead of `space-y-4`

**For Hardcoded Typography:**
- Replace raw HTML/text classes with design system components
- Use `<Text variant="h1">` instead of `<h1 className="text-2xl font-bold">`
- Use `<Text variant="body">` instead of `<p className="text-base">`

**For Component Violations:**
- Use design system components for all UI elements
- Use `<Text>` component for all text content
- Use `<Card>` component for card layouts
- Use `<Button>` component for interactive elements

### Migration Scripts

Run the following migration scripts to automatically fix common violations:

```bash
npm run migrate-colors
npm run migrate-spacing
npm run migrate-text-classes
```

### Priority Actions

1. **High Priority**: Fix component violations (raw HTML tags)
2. **Medium Priority**: Replace hardcoded colors and spacing
3. **Low Priority**: Typography standardization

---

*This report was generated automatically by the Design System Audit tool.*
*Report generated on: 2025-10-04T09:04:19.094Z*
