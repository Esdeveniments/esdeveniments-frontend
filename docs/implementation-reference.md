# Implementation Reference

## Complete Code & Configuration

**Status**: ✅ Ready to Copy/Paste  
**Purpose**: Single source of truth for all design system code

---

## 🎯 Overview

This document contains **ALL code** needed for implementation:

1. Complete `tailwind.config.js` (Week 1)
2. Complete `globals.css` with semantic classes (Week 1)
3. Class reference guide (for daily use)

**⚠️ IMPORTANT**: This is the **ONLY** document with code. All other docs reference this.

---

## 📦 Week 1: tailwind.config.js

**Location**: `/tailwind.config.js`  
**Action**: Replace entire `theme.extend` section

⚠️ **Migration Note - Color Token Naming**: Current config uses `primarydark` (camelCase, deprecated). Week 1 replaces with `primary-dark` (kebab-case, canonical). During migration weeks 1-6, BOTH names work via legacy aliases. Week 7 removes `primarydark`, `primarySoft`, and other legacy aliases.

```js
/** @type {import('tailwindcss').Config} */

const foregroundRgb = "69 69 69";

module.exports = {
  content: ["./components/**/*.{js,ts,jsx,tsx}", "./app/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // === TYPOGRAPHY === //
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1.25" }], // 12px
        sm: ["0.875rem", { lineHeight: "1.4" }], // 14px
        base: ["1rem", { lineHeight: "1.5" }], // 16px
        lg: ["1.125rem", { lineHeight: "1.6" }], // 18px
        xl: ["1.25rem", { lineHeight: "1.6" }], // 20px
        "2xl": ["1.5rem", { lineHeight: "1.6" }], // 24px
        "3xl": ["1.875rem", { lineHeight: "1.4" }], // 30px
        "4xl": ["2.25rem", { lineHeight: "1.25" }], // 36px
        "4.5xl": ["2.625rem", { lineHeight: "1.2" }], // 42px (NEW - hero subtitles)
        "5xl": ["3rem", { lineHeight: "1.15" }], // 48px
      },
      fontFamily: {
        roboto: ["var(--font-roboto-flex)", "sans-serif"],
        barlow: ["var(--font-barlow-condensed)", "sans-serif"],
      },

      // === SCREENS === //
      screens: {
        xs: "360px",
        sm: "576px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
      },

      // === COLORS === //
      colors: {
        // Brand colors
        primary: "#FF0037",
        "primary-dark": "#C8033F",
        "primary-soft": "#FF003750",

        // Semantic tokens (canonical)
        background: "#ffffff",
        foreground: `rgb(${foregroundRgb} / <alpha-value>)`,
        "foreground-strong": "rgb(0 0 0 / <alpha-value>)",
        muted: "#F7F7F7",
        border: "#CCCCCC",
        "primary-foreground": "#ffffff",
        "error-foreground": "#ffffff",

        // Tailwind default neutrals (reference-only)
        // Note: gray-* and white exist in Tailwind, but are NOT canonical here.
        // Avoid using them directly; prefer the semantic tokens above.

        // Semantic colors (NEW)
        success: "#10B981",
        "success-dark": "#059669",
        error: "#EF4444",
        "error-dark": "#DC2626",
        warning: "#F59E0B",
        "warning-dark": "#D97706",
        info: "#3B82F6",
        "info-dark": "#2563EB",

        // Aliases used during migration (deprecated; removal scheduled Week 7 Day 1)
        // Brand (deprecated): primarydark, primarySoft
        // Legacy neutrals (aliases): whiteCorp, darkCorp, blackCorp, fullBlackCorp, bColor
        primarydark: "#C8033F",
        primarySoft: "#FF003750",
        whiteCorp: "#ffffff",
        darkCorp: "#F7F7F7",
        blackCorp: `rgb(${foregroundRgb} / <alpha-value>)`,
        fullBlackCorp: "rgb(0 0 0 / <alpha-value>)",
        bColor: "#cccccc",
      },

      // === SPACING === //
      spacing: {
        // Section spacing
        "section-y": "3rem", // 48px - Vertical section spacing
        "section-x": "1rem", // 16px - Horizontal section padding

        // Card spacing
        "card-padding": "1.5rem", // 24px - Card padding (desktop)
        "card-padding-sm": "1rem", // 16px - Card padding (mobile)

        // Element gaps
        "element-gap": "0.75rem", // 12px - Default gap
        "element-gap-sm": "0.5rem", // 8px - Small gap

        // Button/Input spacing
        "button-x": "1rem", // 16px - Button horizontal padding
        "button-y": "0.5rem", // 8px - Button vertical padding
        "input-x": "0.75rem", // 12px - Input horizontal padding
        "input-y": "0.5rem", // 8px - Input vertical padding

        // Badge spacing
        "badge-x": "0.75rem", // 12px - Badge horizontal padding
        "badge-y": "0.25rem", // 4px - Badge vertical padding
      },

      // === BORDER RADIUS === //
      borderRadius: {
        button: "0.5rem", // 8px - Buttons, small elements
        card: "0.75rem", // 12px - Cards, containers
        input: "0.5rem", // 8px - Form inputs
        badge: "9999px", // Full - Pills, badges
        modal: "1rem", // 16px - Modals, dialogs
      },

      // === SHADOWS (PROFESSIONAL SYSTEM) === //
      boxShadow: {
        none: "none",
        xs: `0 1px 2px 0 rgba(${foregroundRgb}, 0.05)`,
        sm: `0 1px 3px 0 rgba(${foregroundRgb}, 0.1), 0 1px 2px -1px rgba(${foregroundRgb}, 0.06)`,
        DEFAULT: `0 4px 6px -1px rgba(${foregroundRgb}, 0.1), 0 2px 4px -2px rgba(${foregroundRgb}, 0.06)`,
        md: `0 6px 16px -4px rgba(${foregroundRgb}, 0.12), 0 4px 8px -2px rgba(${foregroundRgb}, 0.08)`,
        lg: `0 12px 24px -6px rgba(${foregroundRgb}, 0.15), 0 6px 12px -3px rgba(${foregroundRgb}, 0.1)`,
        xl: `0 20px 32px -8px rgba(${foregroundRgb}, 0.18), 0 8px 16px -4px rgba(${foregroundRgb}, 0.12)`,
        focus: "0 0 0 3px rgba(255, 0, 55, 0.2)",
        "focus-error": "0 0 0 3px rgba(239, 68, 68, 0.2)",
      },

      // === TRANSITIONS === //
      transitionDuration: {
        fast: "100ms", // Instant feedback
        normal: "200ms", // Standard transitions
        slow: "300ms", // Smooth, noticeable
        slower: "500ms", // Modals, page transitions
      },
      transitionTimingFunction: {
        "bounce-subtle": "cubic-bezier(0.34, 1.56, 0.64, 1)",
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
        "ease-out-back": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },

      // === ANIMATIONS === //
      animation: {
        "fast-pulse": "fast-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fast-pulse1": "fast-pulse 300ms cubic-bezier(0.4, 0, 0.6, 1) 100ms",
        appear: "appear 500ms",
        disappear: "disappear 500ms",
      },
      keyframes: {
        "fast-pulse": {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0 },
        },
        appear: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        disappear: {
          "0%": { opacity: 1 },
          "100%": { opacity: 0 },
        },
      },

      // === MISC === //
      flex: {
        2: "2 2 0%",
        3: "3 3 0%",
        4: "4 4 0%",
      },
      zIndex: {
        1: "1",
        10: "10", // sticky nav
        100: "100", // dropdowns, popovers
        900: "900", // modals
        1000: "1000", // tooltips
      },
    },
  },
  plugins: [
    require("@tailwindcss/aspect-ratio"),
    require("@tailwindcss/typography"),
    require("@tailwindcss/forms"),
  ],
};
```

---

## 🎨 Week 1: globals.css (Complete Semantic Classes)

**Location**: `/styles/globals.css`  
**Action**: Add this `@layer components` section AFTER existing base styles

```css
@layer components {
  /* ===================================== */
  /* TYPOGRAPHY */
  /* ===================================== */

  .heading-1 {
    @apply font-barlow text-3xl md:text-5xl font-bold tracking-tight leading-tight uppercase italic;
  }

  .heading-2 {
    @apply font-barlow text-2xl md:text-4xl font-semibold tracking-wide leading-snug uppercase italic;
  }

  .heading-3 {
    @apply font-barlow text-xl md:text-2xl font-semibold tracking-wide leading-snug uppercase italic;
  }

  .heading-4 {
    @apply font-barlow text-lg md:text-xl font-semibold tracking-wide leading-snug uppercase italic;
  }

  .body-large {
    @apply font-roboto text-lg leading-relaxed tracking-normal;
  }

  .body-normal {
    @apply font-roboto text-base leading-relaxed tracking-normal;
  }

  .body-small {
    @apply font-roboto text-sm leading-relaxed tracking-normal;
  }

  .label {
    @apply font-roboto text-xs uppercase tracking-wider font-medium;
  }

  /* ===================================== */
  /* BUTTONS */
  /* ===================================== */

  .btn-primary {
    @apply inline-flex items-center justify-center gap-2 font-barlow font-semibold italic uppercase tracking-wide rounded-button px-button-x py-button-y bg-primary text-primary-foreground hover:bg-primary-dark transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2;
  }

  .btn-neutral {
    @apply inline-flex items-center justify-center gap-2 font-barlow font-semibold italic uppercase tracking-wide rounded-button px-button-x py-button-y border-2 border-border text-foreground hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2;
  }

  .btn-outline {
    @apply inline-flex items-center justify-center gap-2 font-barlow font-semibold italic uppercase tracking-wide rounded-button px-button-x py-button-y border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2;
  }

  .btn-muted {
    @apply inline-flex items-center justify-center gap-2 font-barlow font-semibold italic uppercase tracking-wide rounded-button px-button-x py-button-y bg-muted text-foreground opacity-60 cursor-not-allowed;
  }

  /* ===================================== */
  /* CARDS */
  /* ===================================== */

  .card-bordered {
    @apply bg-background border border-border rounded-card;
  }

  .card-elevated {
    @apply bg-background shadow-lg rounded-card;
  }

  .card-body {
    @apply p-card-padding-sm md:p-card-padding;
  }

  .card-footer {
    @apply border-t border-border p-card-padding-sm md:p-card-padding;
  }

  /* ===================================== */
  /* BADGES */
  /* ===================================== */

  .badge-default {
    @apply inline-flex items-center px-badge-x py-badge-y rounded-badge text-xs font-medium bg-muted text-foreground;
  }

  .badge-primary {
    @apply inline-flex items-center px-badge-x py-badge-y rounded-badge text-xs font-medium bg-primary text-primary-foreground;
  }

  /* ===================================== */
  /* LAYOUT UTILITIES */
  /* ===================================== */

  .flex-center {
    @apply flex justify-center items-center;
  }

  .flex-between {
    @apply flex justify-between items-center;
  }

  .flex-start {
    @apply flex justify-start items-center;
  }

  .stack {
    @apply flex flex-col gap-element-gap;
  }

  /* Containers (Semantic) */
  .container-page {
    @apply max-w-7xl mx-auto px-section-x;
  }
  .container-article {
    @apply max-w-4xl mx-auto px-section-x;
  }
  .container-form {
    @apply max-w-2xl mx-auto px-section-x;
  }

  /* ===================================== */
  /* SHADOWS (SEMANTIC) */
  /* ===================================== */

  .shadow-card {
    @apply shadow-sm;
  }

  .shadow-card-hover {
    @apply shadow-md;
  }

  .shadow-modal {
    @apply shadow-lg;
  }

  .shadow-dropdown {
    @apply shadow-lg;
  }

  .shadow-hero {
    @apply shadow-xl;
  }

  /* ===================================== */
  /* SPACING (SEMANTIC TOKENS USAGE) */
  /* ===================================== */

  /* Use spacing tokens directly in components:
     - Sections: py-section-y px-section-x
     - Cards: p-card-padding-sm md:p-card-padding
     - Inline small gaps: gap-element-gap-sm
  */

  /* ===================================== */
  /* TRANSITIONS (SEMANTIC) */
  /* ===================================== */

  .transition-interactive {
    @apply transition-all duration-fast ease-smooth;
  }

  .transition-card {
    @apply transition-[shadow,transform,border-color] duration-normal ease-smooth;
  }

  .transition-modal {
    @apply transition-[opacity,transform] duration-slow ease-smooth;
  }

  /* Hover effects */
  .hover-lift {
    @apply hover:-translate-y-0.5 hover:shadow-card-hover;
  }

  .hover-scale {
    @apply hover:scale-[1.02] active:scale-[0.98];
  }

  .hover-glow {
    @apply hover:shadow-focus;
  }

  /* ===================================== */
  /* FORMS */
  /* ===================================== */

  .input {
    @apply w-full rounded-input border border-border bg-background text-foreground px-input-x py-input-y h-10 placeholder:text-foreground/60 transition-[box-shadow,border-color] duration-normal ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:border-primary hover:border-border/80;
  }

  .input-lg {
    @apply h-12;
  }

  .input-error {
    @apply border-error focus-visible:ring-error focus-visible:border-error;
  }

  .input-disabled {
    @apply opacity-60 cursor-not-allowed bg-muted pointer-events-none;
  }

  .input-readonly {
    @apply bg-muted;
  }

  .helper-text {
    @apply body-small text-foreground/70 mt-1;
  }

  .helper-text-error {
    @apply body-small text-error mt-1;
  }

  /* ===================================== */
  /* FOCUS UTILITIES */
  /* ===================================== */

  .focus-ring {
    @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2;
  }

  .focus-ring-error {
    @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2;
  }

  /* ===================================== */
  /* Z-INDEX (SEMANTIC) */
  /* ===================================== */

  .z-sticky {
    @apply z-10;
  }
  .z-dropdown {
    @apply z-100;
  }
  .z-modal {
    @apply z-900;
  }
  .z-tooltip {
    @apply z-1000;
  }
}
```

```css
/* Add to styles/globals.css (outside @layer) */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 📖 Class Reference Guide

### Typography

| Class          | Usage                      | Visual Output                                          |
| -------------- | -------------------------- | ------------------------------------------------------ |
| `.heading-1`   | Page title, hero heading   | 48px desktop, 30px mobile, bold, uppercase, italic     |
| `.heading-2`   | Section heading            | 36px desktop, 24px mobile, semibold, uppercase, italic |
| `.heading-3`   | Card title, subsection     | 24px desktop, 20px mobile, semibold, uppercase, italic |
| `.heading-4`   | Small heading, list title  | 20px desktop, 18px mobile, semibold, uppercase, italic |
| `.body-large`  | Intro paragraphs, emphasis | 18px, relaxed line-height                              |
| `.body-normal` | Regular body text          | 16px, relaxed line-height                              |
| `.body-small`  | Secondary info, captions   | 14px, relaxed line-height                              |
| `.label`       | Form labels, badges        | 12px, uppercase, wide tracking                         |

#### Recommended Typography Ramp

| Token       | Mobile (rem) | Desktop (rem) | Line-height |
| ----------- | ------------ | ------------- | ----------- |
| heading-1   | 1.875        | 3             | tight       |
| heading-2   | 1.5          | 2.25          | snug        |
| heading-3   | 1.25         | 1.5           | snug        |
| heading-4   | 1.125        | 1.25          | snug        |
| body-large  | 1.125        | 1.125         | relaxed     |
| body-normal | 1            | 1             | relaxed     |
| body-small  | 0.875        | 0.875         | relaxed     |
| label       | 0.75         | 0.75          | normal      |

Use the semantic classes above; avoid ad-hoc `text-*` utilities.

#### Responsive Defaults & Exceptions

- Default: headings (`.heading-*`) are responsive; body (`.body-*`) is fixed.
- Exceptions (use responsive text deliberately):
  - Hero/marketing copy: responsive allowed.
  - Card titles: prefer `.heading-3` fixed on mobile; allow responsive only if layout permits 2 lines.
  - Narrow mobile nav buttons: keep button text fixed; truncate instead of scaling.
  - Data tables: avoid responsive text to preserve alignment.

#### Standard Weights, Tracking, Clamping, Decoration

- Standard weights: 400 (normal), 500 (medium), 600 (semibold), 700 (bold).
- Tracking: `tracking-tight` for headings; `tracking-wide` for labels; avoid ad-hoc tracking.
- Clamping defaults: card titles `line-clamp-2`; descriptions `line-clamp-3`.
- Links: `underline underline-offset-2 hover:no-underline` by default; prices/discounts may use `line-through`.

**Example:**

```tsx
<h1 className="heading-1">Esdeveniments a Catalunya</h1>
<p className="body-large">Featured events happening this weekend.</p>
<p className="body-normal">Regular paragraph text goes here.</p>
<span className="label">Category</span>
```

---

### Buttons

| Class          | Usage                        | Visual Style                               |
| -------------- | ---------------------------- | ------------------------------------------ |
| `.btn-primary` | Primary CTAs, submit buttons | Red background, white text, hover darker   |
| `.btn-neutral` | Secondary actions, cancel    | White background, black border, hover gray |
| `.btn-outline` | Tertiary actions, links      | Transparent, red border, hover filled      |
| `.btn-muted`   | Disabled state               | Gray background, low opacity               |

**Example:**

```tsx
<button className="btn-primary">Submit Event</button>
<button className="btn-neutral">Cancel</button>
<button className="btn-outline">Learn More</button>
<button className="btn-muted" disabled>Disabled</button>

{/* With custom width */}
<button className="btn-primary w-full">Full Width</button>
```

**Or use the Button component (available after Week 4 adaptation):**

```tsx
import Button from '@/components/ui/common/button';

<Button variant="primary">Submit</Button>
<Button variant="neutral">Cancel</Button>
<Button variant="outline">Learn More</Button>
<Button variant="muted" disabled>Disabled</Button>
```

---

### Cards

| Class            | Usage               | Visual Style                                   |
| ---------------- | ------------------- | ---------------------------------------------- |
| `.card-bordered` | Default card        | White background, border, rounded corners      |
| `.card-elevated` | Elevated card       | White background, shadow, rounded corners      |
| `.card-body`     | Card inner content  | Responsive padding (16px mobile, 24px desktop) |
| `.card-footer`   | Card footer section | Top border, padding                            |

**Example:**

```tsx
<article className="card-bordered">
  <div className="card-body">
    <h3 className="heading-3">Event Title</h3>
    <p className="body-normal">Event description.</p>
  </div>
  <div className="card-footer">
    <button className="btn-primary">Register</button>
  </div>
</article>
```

---

### Badges

| Class            | Usage             | Visual Style                     |
| ---------------- | ----------------- | -------------------------------- |
| `.badge-default` | Neutral badge     | Light gray background, dark text |
| `.badge-primary` | Highlighted badge | Red background, white text       |

**Example:**

```tsx
<span className="badge-default">Free Event</span>
<span className="badge-primary">Featured</span>
```

---

### Layout Utilities

| Class                  | Replaces                            | Usage                                                          |
| ---------------------- | ----------------------------------- | -------------------------------------------------------------- |
| `.flex-center`         | `flex justify-center items-center`  | Center content horizontally & vertically (row layout)          |
| `.flex-between`        | `flex justify-between items-center` | Space-between with vertical center                             |
| `.flex-start`          | `flex justify-start items-center`   | Start alignment with vertical center                           |
| `.stack`               | `flex flex-col gap-element-gap`     | Vertical stack with consistent gap                             |
| `.flex-center-col`     | `flex flex-col items-center`        | Column layout with horizontal centering (children not w-full)  |
| `.center-content`      | `w-full flex justify-center`        | Horizontal centering wrapper for bounded child                 |
| `.container-narrow`    | `w-full px-section-x max-w-*`       | Constrained-width centered content container                   |
| `container` (Tailwind) | theme.container                     | Site-wide nav-aligned container (centered + breakpoint widths) |

**Example:**

```tsx
<div className="flex-center">...</div>
<div className="flex-between">...</div>
<div className="stack">...</div>

// Canonical centering for constrained content (3-layer pattern)
// Layer 1: Full-width outer (no centering)
<div className="w-full bg-background">
  // Layer 2: Horizontal centering wrapper (row)
  <div className="center-content">
    // Layer 3: Constrained width content (gets centered)
    <div className="container-narrow">...</div>
  </div>

  // Sibling: full-width content (not nested)
  <div className="w-full">...</div>
</div>
```

#### Container Policy (App Router)

- Configure Tailwind `theme.container` once (center=true, padding: DEFAULT 0.5rem, lg 0, screens: sm 580, md 768, lg 1024).
- Prefer applying `container` via route-group layouts:
  - `app/(nav)/layout.tsx` wraps pages that must align with navbar/filters.
  - For event detail pages, use `.container-detail` (520px fixed) at a layout or page wrapper.
- Components MUST NOT set page-level widths. If a component needs local padding, only use `px-2 lg:px-0` inside the `container`.
- Remove redundant `sm:w-[580px] md:w-[768px] lg:w-[1024px]` and `mx-auto px-2 lg:px-0` when the parent already provides `container`.

---

### Shadows (Semantic)

| Class                | Usage                   | Shadow Depth             |
| -------------------- | ----------------------- | ------------------------ |
| `.shadow-card`       | Default card shadow     | Subtle (shadow-sm)       |
| `.shadow-card-hover` | Card hover state        | Medium (shadow-md)       |
| `.shadow-modal`      | Modals, dialogs         | Strong (shadow-lg)       |
| `.shadow-dropdown`   | Dropdowns, popovers     | Strong (shadow-lg)       |
| `.shadow-hero`       | Hero sections, featured | Extra strong (shadow-xl) |

**Example:**

```tsx
<article className="card-bordered shadow-card hover-lift transition-card">
  {/* Card content - lifts on hover with shadow-card-hover */}
</article>
```

Policy: In `app/` and `components/`, use semantic shadow classes exclusively. Size-based Tailwind shadows (`shadow-sm/md/lg/xl`) are allowed only inside these semantic class definitions.

---

### Spacing (Tokens)

- Sections: use `py-section-y px-section-x` on the container.
- Cards: use `p-card-padding-sm md:p-card-padding` inside `.card-*`.
- Inline small gaps: use `gap-*` utilities; mirror `element-gap` values for grids (`gap-3` as default), or use `gap-x-3 gap-y-3` where needed.

**Example:**

```tsx
<section className="py-section-y px-section-x">
  {/* Section content with consistent spacing */}
</section>

<div className="card-bordered p-card-padding-sm md:p-card-padding">
  {/* Card with responsive padding */}
  ...
</div>
```

Guidelines:

- Containers: use semantic classes
  - Listings and wide pages: `.container-page`
  - Articles and event detail: `.container-article`
  - Forms and narrow content: `.container-form`
- Margin vs padding: containers provide inner `padding`; spacing between blocks uses margins or the `.stack` utility.
- Grid gaps: use `gap-*` utilities; mirror `element-gap` values for grids (`gap-3` as default), or use `gap-x-3 gap-y-3` where needed.

---

### Transitions (Semantic)

| Class                     | Usage                  | Effect                               |
| ------------------------- | ---------------------- | ------------------------------------ |
| `.transition-interactive` | Buttons, links         | Fast transitions (100ms)             |
| `.transition-card`        | Cards, containers      | Normal transitions (200ms)           |
| `.transition-modal`       | Modals, overlays       | Slow transitions (300ms)             |
| `.hover-lift`             | Cards                  | Lifts up + increases shadow on hover |
| `.hover-scale`            | Buttons, badges        | Scales up on hover, down on press    |
| `.hover-glow`             | Inputs, focus elements | Glows with focus shadow              |

**Example:**

```tsx
<article className="card-bordered shadow-card hover-lift transition-card">
  {/* Card with smooth hover lift */}
</article>

<button className="btn-primary hover-scale">
  {/* Button with scale effect */}
</button>
```

---

## 🎨 Color System Reference

### Brand Colors

| Token          | Value       | Usage                     |
| -------------- | ----------- | ------------------------- |
| `primary`      | `#FF0037`   | Brand red, CTAs, links    |
| `primary-dark` | `#C8033F`   | Hover states, pressed     |
| `primary-soft` | `#FF003750` | Semi-transparent overlays |

### Neutrals (reference-only)

Note: Do not use `white` or `gray-*` classes in application code. These values are shown only for reference. Always use semantic tokens instead: `background`, `foreground`, `foreground-strong`, `muted`, `border`.

Opacity modifier note: the `/NN` suffix (e.g., `text-foreground/80`, `bg-border/40`) is native Tailwind v3+ color opacity syntax, not a custom class.

| Token      | Value           | Usage                   |
| ---------- | --------------- | ----------------------- |
| `white`    | `#ffffff`       | Backgrounds             |
| `gray-50`  | `#F7F7F7`       | Light backgrounds       |
| `gray-100` | `#EEEEEE`       | Subtle backgrounds      |
| `gray-200` | `#DDDDDD`       | Borders, dividers       |
| `gray-300` | `#CCCCCC`       | Default borders         |
| `gray-600` | `rgb(69,69,69)` | Primary text            |
| `gray-900` | `rgb(0,0,0)`    | Headings, high emphasis |

### Semantic Colors (NEW)

| Token          | Value     | Usage                           |
| -------------- | --------- | ------------------------------- |
| `success`      | `#10B981` | Success messages, confirmations |
| `success-dark` | `#059669` | Hover state                     |
| `error`        | `#EF4444` | Error messages, validation      |
| `error-dark`   | `#DC2626` | Hover state                     |
| `warning`      | `#F59E0B` | Warnings, alerts                |
| `warning-dark` | `#D97706` | Hover state                     |
| `info`         | `#3B82F6` | Info messages, tips             |
| `info-dark`    | `#2563EB` | Hover state                     |

**Example:**

```tsx
<div className="bg-success/10 border border-success text-success-dark p-card-padding-sm md:p-card-padding rounded-card">
  ✅ Event created successfully!
</div>

<div className="bg-error/10 border border-error text-error-dark p-card-padding-sm md:p-card-padding rounded-card">
  ❌ Please fill in all required fields.
</div>
```

---

## ♿ Accessibility & Contrast Guidance

- Use `text-primary-foreground` on `bg-primary`; use `text-error-foreground` on `bg-error` (verify contrast on small text).
- Prefer `text-foreground` on `bg-muted` and `bg-background`.
- For muted text, use opacity suffixes on `foreground` (`/80`, `/70`, `/60`) instead of lighter grays.
- Interactive states should keep a minimum AA contrast ratio; when unsure, test tokens quickly with a contrast checker.
- Avoid mixing generic `gray-*` for text; rely on `foreground` with opacity for hierarchy.
- Reduced motion: honor `prefers-reduced-motion`; see globals.css snippet above to dampen or remove animations/transitions.

---

## 🚫 Anti-Patterns (Don't Do This)

### ❌ Don't Mix Semantic Classes with Inline Utilities (Typography)

```tsx
// BAD
<h1 className="heading-1 text-base">Title</h1>

// GOOD
<h3 className="heading-3">Title</h3>
```

### ❌ Don't Override Button Styles Inline

```tsx
// BAD
<button className="btn-primary text-2xl">Submit</button>

// INSTEAD: If a variation is needed frequently, create a new semantic class or component variant.
// One-off overrides are strongly discouraged and should be considered a code smell.
```

### ❌ Don't Use Generic Gray Classes

```tsx
// BAD
<p className="text-gray-600">Description</p>

// GOOD
<p className="text-foreground/80">Description</p>
```

### ❌ Specificity Conflicts & Utility Overrides

Policy:

- Do not override semantic typography or color with ad-hoc utilities. If variation is needed repeatedly, add/extend a semantic class.
- Acceptable utility mixing: layout micro-spacing only (e.g., `mt-2`, `gap-2`) inside leaf components with no cross-component impact.
- If a legacy CSS module overrides semantic classes due to specificity, prefer refactoring the component to rely on semantic classes. Avoid `!important` unless as a last resort and scoped to the component.

### ❌ Don't Use Non-Semantic HTML with Semantic Classes

```tsx
// BAD
<div className="heading-2">Title</div>

// GOOD
<h2 className="heading-2">Title</h2>
```

---

## ✅ Migration Patterns

### Pattern 1: Typography Migration

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

**Lines reduced**: 1 class vs 8 classes (88% reduction)

---

### Pattern 2: Button Migration

**Before:**

```tsx
<button className="inline-flex items-center justify-center gap-2 font-barlow font-semibold italic uppercase tracking-wide rounded-button px-6 py-3 bg-primary text-primary-foreground hover:bg-primary-dark transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
  Submit
</button>
```

**After (Option A - Component):**

```tsx
<Button variant="primary">Submit</Button>
```

**After (Option B - Class):**

```tsx
<button className="btn-primary">Submit</button>
```

**Lines reduced**: 1-2 classes vs 13 classes (85-92% reduction)

---

### Pattern 3: Card Migration

**Before:**

```tsx
<article className="bg-background border border-border rounded-card p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow">
  {/* content */}
</article>
```

**After:**

```tsx
<article className="card-bordered shadow-card hover-lift transition-card">
  <div className="card-body">{/* content */}</div>
</article>
```

**Lines reduced**: 5 semantic classes vs 9 utility classes (44% reduction)

---

### Pattern 4: Layout Migration

**Before:**

```tsx
<div className="flex justify-center items-center gap-4">{/* content */}</div>
```

**After:**

```tsx
<div className="flex-center gap-element-gap">{/* content */}</div>
```

**Lines reduced**: 2 classes vs 4 classes (50% reduction)

---

## 🎯 Quick Tips

1. **Typography**: Always use `.heading-*` and `.body-*` for text
2. **Colors**: Never use `text-gray-*`, use semantic colors from color system
3. **Buttons**: Use `<Button>` component or `.btn-*` classes
4. **Cards**: Use `.card-*` classes for consistent styling
5. **Layout**: Replace repetitive flex patterns with `.flex-*`, `.stack`
6. **Shadows**: Use `.shadow-card`, `.shadow-modal`, etc. (not raw Tailwind shadows)
7. **Spacing**: Use semantic spacing tokens for consistency
8. **Transitions**: Use `.transition-*` and `.hover-*` classes

---

## 📚 Related Documents

- **`design-system-overview.md`** - Why this design system exists
- **`reference-data.md`** - Gray migration mapping, component inventory

---

**This is the SINGLE source of truth for all code.** All other documents reference this file.

**Status**: ✅ Ready to use  
**Last Updated**: October 2025
