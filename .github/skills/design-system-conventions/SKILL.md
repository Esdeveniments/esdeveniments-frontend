---
name: design-system-conventions
description: Guide for UI styling with semantic design system classes. Never use gray-* colors or arbitrary Tailwind utilities.
---

# Design System Conventions Skill

## Purpose

Enforce consistent styling using semantic design system classes. Prevent arbitrary Tailwind utilities and ensure visual consistency.

## ⚠️ CRITICAL: Never Use Generic Grays

**FORBIDDEN**: `text-gray-*`, `bg-gray-*`, `border-gray-*`

**USE INSTEAD**: Semantic tokens from the design system.

## Color Token Reference

| Purpose             | Token                      | Example         |
| ------------------- | -------------------------- | --------------- |
| Primary text        | `text-foreground`          | Main content    |
| Strong text         | `text-foreground-strong`   | Headings        |
| Secondary text      | `text-muted-foreground`    | Hints, metadata |
| Background          | `bg-background`            | Page background |
| Muted background    | `bg-muted`                 | Cards, sections |
| Decorative border   | `border-border`            | Cards, dividers |
| Form control border | `border-input`             | Inputs, selects |
| Primary button text | `text-primary-foreground`  | Button labels   |

### Text Contrast (WCAG AA)

Use two text grays: `text-foreground` (9.59:1) and `text-muted-foreground`
(5.74:1). `text-foreground/80` (5.41:1) is an older equivalent of
`text-muted-foreground`; prefer `text-muted-foreground` in new code.

ESLint blocks `text-foreground/75` and lighter (4.49:1 on `muted`) and
`text-foreground-strong/54` and lighter. They fail 4.5:1. For disabled
states, use `opacity-50` (the existing disabled convention).

Status text and icons on light backgrounds use the `-dark` variants
(`text-error-dark`, `text-warning-dark`, `text-success-dark`). Base
`text-error`, `text-warning` and `text-success` fail AA and are blocked.

```tsx
// ✅ CORRECT
<p className="text-muted-foreground">Secondary text</p>
<button disabled className="text-muted-foreground opacity-50">Unavailable</button>

// ❌ WRONG
<p className="text-gray-600">Secondary text</p>
<p className="text-foreground/60">Secondary text</p>
```

## Typography Classes

**ALWAYS use semantic classes, NEVER arbitrary text-\* utilities for typography.**

| Class          | Usage                  |
| -------------- | ---------------------- |
| `.heading-1`   | Page titles (h1)       |
| `.heading-2`   | Section titles (h2)    |
| `.heading-3`   | Subsection titles (h3) |
| `.heading-4`   | Minor headings (h4)    |
| `.body-large`  | Large body text        |
| `.body-normal` | Default body text      |
| `.body-small`  | Small body text        |
| `.label`       | Form labels, captions  |

### Examples

```tsx
// ✅ CORRECT
<h1 className="heading-1">Page Title</h1>
<p className="body-normal">Content here</p>

// ❌ WRONG
<h1 className="text-3xl md:text-4xl font-bold">Page Title</h1>
<p className="text-base">Content here</p>
```

## Button Classes

Use semantic button classes:

| Class          | Usage                |
| -------------- | -------------------- |
| `.btn-primary` | Primary actions      |
| `.btn-neutral` | Secondary actions    |
| `.btn-outline` | Tertiary actions     |
| `.btn-muted`   | Low-emphasis actions |
| `.btn-ghost`   | Quiet actions, no border until hover |
| `.btn-sm`      | Size modifier (36px, 12px label; 44px on touch). Combine with a variant for dense rows, not for a page's main actions |

Every variant `@apply`s the shared `.btn-base` (in `styles/globals.css`) and
adds only colours, so a new variant must do the same. The shared box: 14px uppercase label, 2px border (transparent on
filled variants) and one minimum height (`min-h-button`): 40px with a mouse,
44px on touch screens via `--button-height` and `pointer: coarse`.
`min-h-button-sm` is 36px (44px on touch). Use `h-button w-button` for icon-only buttons. Do not add
`min-h-[44px]`, `py-*` or `text-*` overrides to resize a button. Use `.btn-sm`
for compact actions. Don't override `display` (`inline-block`/`block`), because
it breaks vertical centering. In narrow dialogs, stack the actions full width
so long labels never wrap inside a pill.

```tsx
// ✅ CORRECT
<button className="btn-primary">Submit</button>

// ❌ WRONG
<button className="bg-primary text-whiteCorp px-6 py-3 rounded-xl hover:bg-primarydark">
  Submit
</button>
```

## Card Classes

| Class            | Usage                      |
| ---------------- | -------------------------- |
| `.card-bordered` | Border + subtle shadow     |
| `.card-elevated` | Stronger shadow, no border |
| `.card-body`     | Inner padding              |
| `.card-footer`   | Footer section             |

```tsx
// ✅ CORRECT
<div className="card-bordered">
  <div className="card-body">
    <h3 className="heading-3">Card Title</h3>
    <p className="body-normal">Content</p>
  </div>
</div>
```

## Badge Classes

| Class            | Usage                     |
| ---------------- | ------------------------- |
| `.badge-primary` | Red background (emphasis) |
| `.badge-default` | Gray background (neutral) |

## Layout Utilities

Replace repetitive flex patterns:

| Semantic Class  | Replaces                            |
| --------------- | ----------------------------------- |
| `.flex-center`  | `flex justify-center items-center`  |
| `.flex-between` | `flex justify-between items-center` |
| `.flex-start`   | `flex justify-start items-center`   |
| `.stack`        | `flex flex-col gap-element-gap`     |

```tsx
// ✅ CORRECT
<div className="flex-center gap-element-gap">
  <Icon />
  <span>Text</span>
</div>

// ❌ WRONG
<div className="flex justify-center items-center gap-4">
  <Icon />
  <span>Text</span>
</div>
```

## Spacing Tokens

| Token                          | Usage              |
| ------------------------------ | ------------------ |
| `py-section-y`, `px-section-x` | Section spacing    |
| `p-card-padding`               | Card inner padding |
| `gap-element-gap`              | Default gaps       |

### Tailwind Spacing Exception

**Allowed**: One-off micro-spacing inside leaf components (`gap-1`, `gap-2`, `p-1`, `p-2`)

**Not allowed**:

- Section/page/layout spacing
- Card/button/input paddings
- Shared components

**Rule**: If repeated → create/extend a semantic token instead.

## Border Radius Tokens

| Token            | Usage        | Value |
| ---------------- | ------------ | ----- |
| `rounded-button` | Buttons      | full pill |
| `rounded-card`   | Cards        | 12px  |
| `rounded-input`  | Form inputs  | 8px   |
| `rounded-badge`  | Pills/badges | full  |

## Deprecated Aliases - DO NOT USE

❌ `primarydark`, `primarySoft`, `whiteCorp`, `darkCorp`, `blackCorp`, `fullBlackCorp`, `bColor`

Use semantic tokens instead.

## Migration Context

Semantic classes are already the established convention across the codebase (heading/body classes, `.btn-*`, `.card-*` all in active use). When modifying existing components:

1. Prefer semantic classes over inline utilities
2. Keep changes incremental
3. Consult `/docs/reference-data.md` for priority
4. Use new semantic color tokens

## Checklist Before Styling

- [ ] Using semantic typography classes? (not `text-xl font-bold`)
- [ ] Using semantic color tokens? (not `gray-*`)
- [ ] Using button classes? (not inline utilities)
- [ ] Using card classes? (not custom shadows/borders)
- [ ] Using layout utilities? (`flex-center` vs manual flex)
- [ ] Using spacing tokens? (for consistent spacing)

## Files to Reference

- [styles/globals.css](../../../styles/globals.css) - Design system classes
- [tailwind.config.js](../../../tailwind.config.js) - Theme tokens
- [docs/design-system-overview.md](../../../docs/design-system-overview.md) - Full documentation
- [docs/implementation-reference.md](../../../docs/implementation-reference.md) - Code examples
