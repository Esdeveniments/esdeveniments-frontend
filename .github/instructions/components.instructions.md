---
applyTo: "components/**/*.tsx"
---

# Component Guidelines

- **Server Components by default.** Only add `"use client"` at the smallest leaf that truly needs browser APIs, state, or effects.
- Use `Link` from `@i18n/routing` for internal links — never `next/link` directly.
- Do NOT use `next/dynamic` with `ssr: false` inside Server Components. Extract the client-only part into its own `"use client"` component and import it directly.
- Use `useRef` (not `useState`) for one-time tracking flags that don't affect rendering (e.g., analytics).
- **No barrel files** (`index.ts` re-exports) that mix `"use client"` components from different route contexts — use direct file imports.
- Define component prop types in `types/props.ts` or `types/common.ts`, never inline.
- Use semantic design system classes (`.heading-*`, `.body-*`, `.btn-*`, `.card-*`) instead of arbitrary Tailwind utilities. Never use `gray-*` colors — use `foreground`, `muted`, `border` tokens.
