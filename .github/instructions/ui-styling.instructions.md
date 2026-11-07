---
applyTo: "components/ui/**/*.tsx"
---

# Design System & Styling Rules

- **Colors**: semantic tokens (`text-foreground`, `text-muted-foreground`, `bg-background`, `bg-muted`, `border-border`, `border-input`). Never `gray-*` or hex.
- **Typography**: `.heading-1`–`.heading-4`, `.body-large`, `.body-normal`, `.body-small`, `.label`. No arbitrary `text-*` sizes.
- **Buttons**: `Button` from `components/ui/common/button` (`variant`), or `.btn-primary`, `.btn-neutral`, `.btn-outline`, `.btn-muted`, `.btn-ghost` (+ `.btn-sm` for compact). Don't resize with `py-*`/`text-*`.
- **Cards**: `.card-bordered` or `.card-elevated` with `.card-body`, `.card-footer`. Event and news cards are `CardLayout` (`.card-event*` classes); see the `design-system-conventions` skill.
- **Layout/spacing**: `.flex-center`, `.flex-between`, `.flex-start`, `.stack`; `gap-element-gap`, `py-section-y`, `px-section-x`, `p-card-padding`.
- **Radius**: `rounded-button`, `rounded-card`, `rounded-input`, `rounded-badge`.
- Reference: `DESIGN.md` and the `design-system-conventions` skill.
