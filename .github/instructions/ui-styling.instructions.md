---
applyTo: "components/ui/**/*.tsx"
---

# Design System & Styling Rules

- **Colors**: Use semantic tokens (`text-foreground`, `bg-background`, `bg-muted`, `border-border`). NEVER use `gray-*` colors or hardcoded hex values.
- **Typography**: Use semantic classes (`.heading-1`–`.heading-4`, `.body-large`, `.body-normal`, `.body-small`, `.label`). Never use arbitrary `text-*` size utilities.
- **Buttons**: Use `.btn-primary`, `.btn-neutral`, `.btn-outline`, `.btn-muted` classes.
- **Cards**: Use `.card-bordered` or `.card-elevated` with `.card-body`, `.card-header`, `.card-footer`.
- **Layout**: Use `.flex-center`, `.flex-between`, `.flex-start`, `.stack` instead of manual flex patterns. Use `gap-element-gap`, `py-section-y`, `px-section-x`, `p-card-padding` for spacing.
- **Border radius**: `rounded-button`, `rounded-card`, `rounded-input`, `rounded-badge`.
- Reference: `/docs/implementation-reference.md` for the full design system code reference.
