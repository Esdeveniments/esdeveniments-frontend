---
name: design-system-conventions
description: Semantic Tailwind classes, color tokens, text contrast rules and the Button/Badge components for this repo's UI. Use when adding or changing Tailwind classes, colors, typography, buttons, cards, badges, spacing, focus rings, form controls or any UI component. Never use gray-* colors or arbitrary Tailwind utilities.
---

# Design System Conventions

Full design rules and tokens: `DESIGN.md`. Classes: `styles/globals.css`. Tokens: `tailwind.config.js`. Summary: AGENTS.md › UI.

## Colors

Never `text-gray-*`, `bg-gray-*`, `border-gray-*`, hex values, or the removed aliases (`primarydark`, `primarySoft`, `whiteCorp`, `darkCorp`, `blackCorp`, `fullBlackCorp`, `bColor`).

| Purpose | Token |
| --- | --- |
| Primary text | `text-foreground` |
| Strong text / headings | `text-foreground-strong` |
| Secondary text (hints, metadata) | `text-muted-foreground` |
| Page background | `bg-background` |
| Muted background | `bg-muted` |
| Decorative border | `border-border` |
| Form control border | `border-input` |
| Text on primary | `text-primary-foreground` |

**Contrast (WCAG AA).** Two text grays only: `text-foreground` (9.59:1) and `text-muted-foreground` (5.74:1). `text-foreground/80` is an older equivalent; use `text-muted-foreground` in new code. ESLint blocks `text-foreground/75` and lighter, and `text-foreground-strong/54` and lighter. Disabled: `opacity-50`. Status text and icons use `text-error-dark`, `text-warning-dark`, `text-success-dark`; the base `text-error`/`-warning`/`-success` fail AA and are blocked.

**Forms.** Checkboxes and radios get the brand color and a `:focus-visible` ring from the base layer in `globals.css`. Don't add `accent-*` (the forms plugin ignores it) or `focus:ring-0` (hides keyboard focus).

## Typography

`.heading-1`…`.heading-4`, `.body-large`, `.body-normal`, `.body-small`, `.label`. Not `text-3xl font-bold` and friends.

## Buttons

- Plain `<button>`: use `Button` (`components/ui/common/button`, `variant`: `neutral` default, `primary`, `outline`, `muted`, `ghost`, `category`, `solid` = primary; `hasIcon`). Links styled as buttons: the classes directly.
- Classes: `.btn-primary`, `.btn-neutral`, `.btn-outline`, `.btn-muted`, `.btn-ghost` (fill only on hover), `.btn-category`; size modifier `.btn-sm` (36px, 12px label; 44px on touch) for dense rows, not a page's main action.
- Every variant `@apply`s `.btn-base` and adds only colors; a new variant must do the same. Shared box: 14px uppercase label, 2px border, `min-h-button` (40px mouse, 44px touch). Icon-only: `h-button w-button`.
- Don't resize with `py-*`, `text-*` or `min-h-[44px]`, and don't override `display`. In narrow dialogs, stack actions full width so labels never wrap.

## Cards, badges, layout

- Cards: `.card-bordered` (border + subtle shadow) or `.card-elevated` (stronger shadow), with `.card-body` and `.card-footer`. There is no `.card-header`.
- Badges: `.badge-primary`, `.badge-default`. Clickable chips/pills: `Badge` (`components/ui/common/badge`, renders a link when given `href`).
- Layout: `.flex-center`, `.flex-between`, `.flex-start`, `.flex-center-col`, `.stack` (= `flex flex-col gap-element-gap`).
- Spacing tokens: `py-section-y`, `px-section-x`, `p-card-padding`, `gap-element-gap`. Raw Tailwind spacing (`gap-1`/`2`, `p-1`/`2`) only for one-off micro-spacing inside a leaf; never for section, card, button or input padding or shared components. Repeated? Add a token.
- Radius: `rounded-button` (pill), `rounded-card` (12px), `rounded-input` (8px), `rounded-badge` (pill).

## Example

```tsx
// ✅
<div className="card-bordered">
  <div className="card-body stack">
    <h3 className="heading-3">Title</h3>
    <p className="body-small text-muted-foreground">Meta</p>
    <Button variant="primary">Desa</Button>
  </div>
</div>

// ❌
<div className="rounded-xl border border-gray-200 p-6 flex flex-col gap-4">
  <h3 className="text-xl font-bold">Title</h3>
  <p className="text-sm text-gray-500">Meta</p>
  <button className="bg-primary text-whiteCorp px-6 py-3">Desa</button>
</div>
```

The migration to semantic classes is finished. When touching old code, switch it to these classes in small steps.
