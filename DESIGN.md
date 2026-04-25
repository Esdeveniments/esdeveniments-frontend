---
name: Esdeveniments
description: >
  Catalan cultural agenda — warm, content-first, mobile-native. A single
  confident Catalan red anchors a near-monochrome canvas. The type stack is
  the operating system's own (no webfonts). Buttons are full pills, cards
  carry the page, and the hero leans on documentary photography of regional
  traditions under a darkening overlay.

colors:
  primary:           "#D6002F"
  primary-dark:      "#A80025"
  primary-soft:      "#D6002F50"
  primary-tint:      "#D6002F14"
  primary-tint-soft: "#D6002F0F"
  background:        "#FFFFFF"
  surface-muted:     "#F7F7F7"
  foreground:        "#454545"
  foreground-strong: "#000000"
  foreground-muted:  "#6B7280"
  on-primary:        "#FFFFFF"
  on-photo:          "#FFFFFF"
  border:            "#CCCCCC"
  border-strong:     "#454545"
  border-subtle:     "#CCCCCC66"
  border-soft:       "#CCCCCC33"
  overlay-hero:      "#00000099"
  overlay-scrim:     "#CCCCCC99"
  glass-rest:        "#FFFFFF26"
  glass-hover:       "#FFFFFF40"
  glass-border:      "#FFFFFF4D"
  glass-border-hover:"#FFFFFF99"
  success:           "#10B981"
  success-dark:      "#059669"
  success-light:     "#ECFDF5"
  success-muted:     "#D1FAE5"
  success-border:    "#A7F3D0"
  error:             "#EF4444"
  error-dark:        "#DC2626"
  warning:           "#F59E0B"
  warning-dark:      "#D97706"
  warning-light:     "#FFFBEB"
  warning-muted:     "#FEF3C7"
  warning-border:    "#FDE68A"
  info:              "#3B82F6"
  info-dark:         "#2563EB"

typography:
  fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif"
  heading-1:
    fontSize: "36px"
    fontWeight: 700
    lineHeight: "1.25"
    letterSpacing: "-0.01em"
  heading-1-mobile:
    fontSize: "24px"
    fontWeight: 700
    lineHeight: "1.25"
    letterSpacing: "-0.01em"
  heading-2:
    fontSize: "24px"
    fontWeight: 600
    lineHeight: "1.6"
    letterSpacing: "0"
  heading-2-mobile:
    fontSize: "20px"
    fontWeight: 600
    lineHeight: "1.6"
    letterSpacing: "0"
  heading-3:
    fontSize: "20px"
    fontWeight: 600
    lineHeight: "1.4"
    letterSpacing: "0"
  heading-3-mobile:
    fontSize: "18px"
    fontWeight: 600
    lineHeight: "1.4"
    letterSpacing: "0"
  heading-4:
    fontSize: "18px"
    fontWeight: 500
    lineHeight: "1.4"
    letterSpacing: "0"
  heading-4-mobile:
    fontSize: "16px"
    fontWeight: 500
    lineHeight: "1.4"
    letterSpacing: "0"
  body-large:
    fontSize: "18px"
    fontWeight: 400
    lineHeight: "1.6"
    letterSpacing: "0"
  body:
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "1.6"
    letterSpacing: "0"
  body-small:
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "1.4"
    letterSpacing: "0"
  label:
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "1.25"
    letterSpacing: "0.05em"
    textTransform: "uppercase"
  label-tight:
    fontSize: "11px"
    fontWeight: 600
    lineHeight: "1.25"
    letterSpacing: "0"
  form-label:
    fontSize: "18px"
    fontWeight: 600
    lineHeight: "1.4"
    letterSpacing: "0"
  helper:
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "1.5"
    letterSpacing: "0"

rounded:
  none:    "0px"
  sm:      "8px"
  DEFAULT: "12px"
  md:      "12px"
  lg:      "16px"
  full:    "9999px"

spacing:
  unit:    "4px"
  xs:      "4px"
  sm:      "8px"
  md:      "12px"
  lg:      "16px"
  xl:      "24px"
  2xl:     "32px"
  3xl:     "48px"
  4xl:     "64px"
  sticky-offset: "128px"

elevation:
  none:        "none"
  xs:          "0 1px 2px 0 #4545450D"
  sm:          "0 1px 3px 0 #4545451A, 0 1px 2px -1px #4545450F"
  md:          "0 6px 16px -4px #4545451F, 0 4px 8px -2px #45454514"
  lg:          "0 12px 24px -6px #45454526, 0 6px 12px -3px #4545451A"
  xl:          "0 20px 32px -8px #4545452E, 0 8px 16px -4px #4545451F"
  focus:       "0 0 0 3px #D6002F33"
  focus-error: "0 0 0 3px #EF444433"

motion:
  duration-instant: "100ms"
  duration-normal:  "200ms"
  duration-slow:    "300ms"
  duration-slower:  "500ms"
  easing-smooth:    "cubic-bezier(0.4, 0, 0.2, 1)"
  easing-bounce:    "cubic-bezier(0.34, 1.56, 0.64, 1)"

breakpoints:
  xs: "360px"
  sm: "576px"
  md: "768px"
  lg: "1024px"
  xl: "1280px"

containers:
  page:    "1280px"
  article: "896px"
  form:    "672px"
  detail:  "520px"

components:
  button-primary:
    background: "{colors.primary}"
    color: "{colors.on-primary}"
    fontSize: "{typography.label.fontSize}"
    fontWeight: 600
    letterSpacing: "{typography.label.letterSpacing}"
    textTransform: "uppercase"
    paddingX: "{spacing.lg}"
    paddingY: "{spacing.sm}"
    rounded: "{rounded.full}"
    transition: "background {motion.duration-normal} {motion.easing-smooth}"
  button-primary-hover:
    background: "{colors.primary-dark}"
  button-primary-focus:
    boxShadow: "{elevation.focus}"
  button-primary-pressed:
    transform: "translateY(1px) scale(0.995)"
    opacity: 0.9
  button-primary-disabled:
    opacity: 0.5
    cursor: "not-allowed"

  button-outline:
    background: "transparent"
    color: "{colors.primary}"
    border: "2px solid {colors.primary}"
    fontWeight: 600
    textTransform: "uppercase"
    paddingX: "{spacing.lg}"
    paddingY: "{spacing.sm}"
    rounded: "{rounded.full}"
  button-outline-hover:
    background: "{colors.primary}"
    color: "{colors.on-primary}"

  button-neutral:
    background: "transparent"
    color: "{colors.foreground}"
    border: "2px solid {colors.border}"
    fontWeight: 600
    textTransform: "uppercase"
    paddingX: "{spacing.lg}"
    paddingY: "{spacing.sm}"
    rounded: "{rounded.full}"
  button-neutral-hover:
    background: "{colors.surface-muted}"

  button-ghost:
    background: "transparent"
    color: "{colors.foreground}"
    fontWeight: 600
    textTransform: "uppercase"
    paddingX: "{spacing.lg}"
    paddingY: "{spacing.sm}"
    rounded: "{rounded.full}"
  button-ghost-hover:
    background: "{colors.surface-muted}"

  button-category:
    background: "{colors.background}"
    color: "{colors.foreground}"
    border: "1px solid {colors.border-subtle}"
    fontWeight: 600
    textTransform: "uppercase"
    paddingX: "{spacing.lg}"
    paddingY: "10px"
    rounded: "{rounded.full}"
  button-category-hover:
    borderColor: "{colors.primary}"
    color: "{colors.primary}"

  button-muted:
    background: "{colors.surface-muted}"
    color: "{colors.foreground}"
    opacity: 0.6
    cursor: "not-allowed"
    rounded: "{rounded.full}"

  card-default:
    background: "{colors.background}"
    border: "1px solid {colors.border-soft}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
    shadow: "none"
    transition: "border-color {motion.duration-normal} {motion.easing-smooth}, box-shadow {motion.duration-normal} {motion.easing-smooth}"
  card-default-hover:
    border: "1px solid {colors.border-subtle}"
    shadow: "{elevation.md}"
  card-elevated:
    background: "{colors.background}"
    rounded: "{rounded.md}"
    shadow: "{elevation.lg}"
  card-image:
    aspectRatio: "3 / 2"
    background: "{colors.surface-muted}"
    objectFit: "cover"
  card-image-hover:
    transform: "scale(1.03)"
    transition: "transform {motion.duration-slow} {motion.easing-smooth}"
  card-title:
    fontSize: "{typography.body.fontSize}"
    fontWeight: 600
    lineHeight: "1.4"
    color: "{colors.foreground-strong}"
    minHeight: "44px"
  card-title-hover:
    color: "{colors.primary}"
    opacity: 0.85
  card-meta:
    fontSize: "{typography.body-small.fontSize}"
    color: "{colors.foreground-muted}"
  card-meta-urgent-today:
    color: "{colors.primary}"
    fontWeight: 600
  card-meta-urgent-soon:
    color: "{colors.warning-dark}"
    fontWeight: 500
  card-meta-price-free:
    color: "{colors.success}"
    fontWeight: 500

  badge-default:
    background: "{colors.surface-muted}"
    color: "{colors.foreground}"
    rounded: "{rounded.full}"
    paddingX: "{spacing.md}"
    paddingY: "{spacing.xs}"
    fontSize: "{typography.label.fontSize}"
    fontWeight: 500
  badge-primary:
    background: "{colors.primary}"
    color: "{colors.on-primary}"
    rounded: "{rounded.full}"
    paddingX: "{spacing.md}"
    paddingY: "{spacing.xs}"
    fontSize: "{typography.label.fontSize}"
    fontWeight: 500
  badge-category:
    background: "{colors.surface-muted}"
    color: "{colors.foreground-strong}"
    rounded: "{rounded.full}"
    fontSize: "{typography.label-tight.fontSize}"
    fontWeight: 600
    paddingX: "{spacing.sm}"
    paddingY: "2px"

  chip-on-light:
    background: "{colors.background}"
    color: "{colors.foreground}"
    border: "1px solid {colors.border-subtle}"
    rounded: "{rounded.full}"
    paddingX: "{spacing.md}"
    paddingY: "6px"
    fontSize: "{typography.body-small.fontSize}"
    shadow: "{elevation.xs}"
  chip-on-light-hover:
    background: "{colors.surface-muted}"
    color: "{colors.foreground-strong}"
  chip-on-photo:
    background: "{colors.glass-rest}"
    color: "{colors.on-photo}"
    border: "1px solid {colors.glass-border}"
    rounded: "{rounded.full}"
    paddingX: "{spacing.lg}"
    paddingY: "{spacing.sm}"
    fontSize: "{typography.body-small.fontSize}"
    fontWeight: 500
    backdropFilter: "blur(8px)"
  chip-on-photo-hover:
    background: "{colors.glass-hover}"
    borderColor: "{colors.glass-border-hover}"
  chip-on-photo-active:
    background: "{colors.primary}"
    borderColor: "{colors.primary}"
    color: "{colors.on-primary}"
    shadow: "{elevation.md}"

  input-default:
    background: "{colors.background}"
    color: "{colors.foreground}"
    border: "1px solid {colors.border}"
    rounded: "{rounded.sm}"
    fontSize: "{typography.body.fontSize}"
    paddingX: "{spacing.md}"
    paddingY: "{spacing.sm}"
    height: "40px"
    transition: "border-color {motion.duration-normal} {motion.easing-smooth}, box-shadow {motion.duration-normal} {motion.easing-smooth}"
  input-default-hover:
    borderColor: "{colors.border}"
  input-default-focus:
    borderColor: "{colors.primary}"
    boxShadow: "{elevation.focus}"
  input-default-error:
    borderColor: "{colors.error}"
    boxShadow: "{elevation.focus-error}"
  input-default-disabled:
    background: "{colors.surface-muted}"
    opacity: 0.6
    cursor: "not-allowed"
  input-large:
    height: "48px"

  modal-panel:
    background: "{colors.background}"
    rounded: "{rounded.lg}"
    shadow: "{elevation.lg}"
    width: "500px"
  modal-panel-mobile:
    background: "{colors.background}"
    rounded: "{rounded.none}"
    width: "100vw"
    height: "100dvh"
  modal-backdrop:
    background: "{colors.overlay-scrim}"

  navbar-desktop:
    background: "{colors.background}"
    borderBottom: "1px solid {colors.border-subtle}"
    shadow: "{elevation.sm}"
    height: "56px"
    backdropFilter: "blur(8px)"
  navbar-mobile:
    background: "{colors.background}"
    borderTop: "1px solid {colors.border}"
    shadow: "{elevation.lg}"
    height: "64px"
    backdropFilter: "blur(12px)"
  navbar-mobile-item:
    minWidth: "44px"
    minHeight: "44px"
    rounded: "{rounded.full}"
  navbar-mobile-item-active:
    color: "{colors.primary}"
    background: "{colors.primary-tint}"

  hero-banner:
    background: "{colors.overlay-hero}"
    color: "{colors.on-photo}"
    paddingY: "{spacing.2xl}"
  hero-title:
    fontSize: "{typography.heading-1.fontSize}"
    fontWeight: 700
    color: "{colors.on-photo}"
    textShadow: "0 2px 8px #00000080"
  hero-subtitle:
    fontSize: "{typography.body-large.fontSize}"
    color: "{colors.on-photo}"
    opacity: 0.9
    textShadow: "0 1px 4px #00000080"
  hero-search-bar:
    background: "{colors.background}"
    rounded: "{rounded.full}"
    shadow: "{elevation.sm}"
    border: "1px solid {colors.border}"
    height: "48px"
    paddingX: "{spacing.lg}"
  hero-search-bar-focus:
    borderColor: "{colors.primary}"
    shadow: "{elevation.md}"

  date-quick-filter-rest:
    background: "{colors.glass-rest}"
    color: "{colors.on-photo}"
    border: "1px solid {colors.glass-border}"
    rounded: "{rounded.full}"
    paddingX: "{spacing.lg}"
    paddingY: "{spacing.sm}"
    fontSize: "{typography.body-small.fontSize}"
    fontWeight: 500
    backdropFilter: "blur(8px)"
  date-quick-filter-rest-hover:
    background: "{colors.glass-hover}"
    borderColor: "{colors.glass-border-hover}"
  date-quick-filter-active:
    background: "{colors.primary}"
    borderColor: "{colors.primary}"
    color: "{colors.on-primary}"
    shadow: "{elevation.md}"
    leadingIcon: "check"

  footer:
    background: "{colors.background}"
    borderTop: "1px solid {colors.border}"
    paddingY: "{spacing.3xl}"
  footer-link:
    fontSize: "{typography.label.fontSize}"
    fontWeight: 600
    color: "{colors.foreground}"
    textTransform: "uppercase"
    letterSpacing: "{typography.label.letterSpacing}"
  footer-link-hover:
    color: "{colors.primary}"
  footer-agenda-link:
    fontSize: "{typography.body-small.fontSize}"
    color: "{colors.foreground}"
    opacity: 0.8
  footer-agenda-link-hover:
    color: "{colors.primary}"
    textDecoration: "underline"
    textDecorationThickness: "2px"
    textUnderlineOffset: "4px"

  date-picker-day:
    color: "{colors.foreground}"
    rounded: "{rounded.full}"
    width: "28px"
    height: "28px"
    fontSize: "13px"
  date-picker-day-selected:
    background: "{colors.primary}"
    color: "{colors.on-primary}"
    fontWeight: 600
  date-picker-day-range-middle:
    background: "{colors.primary-tint}"
    color: "{colors.foreground}"
    rounded: "{rounded.none}"
  date-picker-day-today:
    border: "1px solid {colors.primary-soft}"
  date-picker-day-disabled:
    color: "{colors.foreground}"
    opacity: 0.25

  favorite-button:
    color: "{colors.primary}"
    background: "{colors.background}"
    rounded: "{rounded.full}"
    shadow: "{elevation.sm}"
  favorite-button-active:
    transform: "scale(1.15)"
    transition: "transform {motion.duration-slow} {motion.easing-smooth}"

  skeleton:
    background: "{colors.surface-muted}"
    rounded: "{rounded.md}"
    animation: "fast-pulse 2s {motion.easing-smooth} infinite"

  nav-progress-bar:
    background: "{colors.primary}"
    height: "3px"
---

## Overview

A neighborhood noticeboard rendered with the polish of a modern app. The
core job is helping people in Catalonia decide what to do today, this
weekend, or near a town they're visiting — so every screen is a thin frame
around event imagery and a few decisive details (date, place, price). Chrome
retreats; the photography and the listings carry the page.

The voice is local and unhurried. Copy is sentence-case, human, and lightly
multilingual (Catalan first, with Spanish and English). The visual system is
quiet enough to host hundreds of cards in a row without fatigue, and warm
enough that a single event detail page still feels like an invitation rather
than a database record.

The aesthetic targets are *civic*, *warm*, *photographic*, *content-first*,
*native*, and *Mediterranean*. Reference points are GitHub and Facebook for
system-font pragmatism, Airbnb-style event grids for soft shadows and
generous gutters, and the Catalan flag's senyera red for brand confidence.

## Colors

One brand color does almost all the work: a confident Catalan red,
intentionally darkened from a brighter `#FF0037` to **`#D6002F`** so it
clears WCAG AA against white (≈ 5.2:1). It marks calls-to-action, the active
state on filters, the focus glow, hyperlink hovers on the footer's agenda
grid, and the price accents on cards. A deeper variant `#A80025` handles
pressed and hover states. A 31%-alpha "primary-soft" wash is the only
acceptable way to use red as a fill on light surfaces — used for date-range
middles, soft glows, and active chip tints.

Everything else is neutral. The canvas is true `#FFFFFF`; chrome and
disabled fills sit on `#F7F7F7`. Body text is **`#454545`** — never pure
black — which gives the page a slightly softer, paper-like cast and pairs
naturally with the warm red. Headings and form labels go to true black for
hierarchy. Borders are `#CCCCCC` at full strength but more often appear at
20–60% alpha as hairlines that frame cards without competing with them.

Status colors (success green, warning amber, error red, info blue) are
imported from a conventional palette and are *only* used for their meaning —
never decoratively. Success green appears on free or discounted price
labels; warning amber on "few seats left" / soon-to-expire urgency; error
red on validation; info blue is reserved for system notices.

The hero is the one place the palette flips. There, full-bleed documentary
photography sits under a **60% black overlay** (`#00000099`), white type
carries `text-shadow`, and inactive filter chips take on a glassmorphic look
— `#FFFFFF26` fill with an 8px backdrop blur and a `#FFFFFF4D` border that
brightens on hover. The active filter chip drops the glass and goes solid
red with a leading checkmark.

Contrast budget: body on white ≈ 7.5:1 (AAA); primary on white ≈ 5.2:1
(AA); muted-foreground on white ≈ 4.6:1 (AA). No token below AA is used for
text.

## Typography

The product uses the **system font stack** — `-apple-system`,
`BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `Helvetica Neue`, `Arial` — same
as Facebook, GitHub, Instagram, and Twitter. There are no webfonts to load,
no FOUT, no licensing overhead. The trade-off is intentional: a civic,
community-built product should feel native to whatever device the reader is
on rather than imposing a brand voice through letterforms.

Because system fonts hint and render slightly stronger than custom display
faces, weights are tuned conservatively: **400** for body, **500** for nav
labels and small UI, **600** for headings (semibold), **700** only for the
hero H1. `font-synthesis` is disabled so we never get a smeared faux-bold.

The type scale follows a four-level heading model:

- **heading-1** (24/700 mobile → 36/700 desktop) — page identity, one per
  page, typically the hero greeting.
- **heading-2** (20/600 mobile → 24/600 desktop) — major section dividers.
- **heading-3** (18/600 mobile → 20/600 desktop) — subsections, category
  headers.
- **heading-4** (16/500 mobile → 18/500 desktop) — card titles, footer
  block titles.

UI chrome — nav links, footer links, button labels — uses a small **label**
style: 12/500, **uppercase**, with widened tracking. This is the one place
the type design speaks loudly, and it gives buttons their characteristic
civic-poster confidence. A `label-tight` (11/600) is reserved for category
badges on cards.

Body inputs are pinned to **16px** to defeat iOS Safari's focus auto-zoom.

## Layout

A mobile-first canvas with a clean expansion at 768px. The page uses four
container widths:

- **page** (1280px) — the outermost cap.
- **article** (896px) — long-form pages, terms, privacy.
- **form** (672px) — focused vertical spines for forms and settings.
- **detail** (520px) — the event detail spine.

Vertical rhythm is anchored by `spacing.3xl` (48px) for major section
breaks, with `spacing.2xl` (32px) and `spacing.4xl` (64px) variants.
Horizontal gutter is `spacing.lg` (16px) until **lg**, where the gutter
drops to 0 and the container is centered. A `spacing.sticky-offset` of
128px reserves space below the fixed search/filter bar on listing pages so
the first row of cards never slides under the chrome.

Cards live in a responsive grid: 1 column on mobile, 2 on **sm**, 3 on
**md+**, with `spacing.md` (12px) between cells. Card titles use a 2-line
clamp and a fixed `min-height` so adjacent cards visually align even when
titles vary.

Z-layers are explicit: 10 sticky chrome, 100 dropdowns, 900 modals, 1000
tooltips. Anything above 1000 is forbidden.

Navigation is a top sticky bar on desktop, a fixed bottom tab bar on mobile
— a deliberate native-app affordance for a product that's used walking
around towns. The desktop bar is 56px tall with a backdrop blur and a
hairline border. The mobile bar is 64px tall with five circular icon-only
buttons (Home, Agenda, Favorites, Publish, News), each at least 44×44 px;
the active route fills with `colors.primary-tint` and tints its icon
primary red.

## Elevation & Depth

Shadows are deliberately soft. They use the body color (`#454545`) at low
alpha rather than pure black, with short y-offsets and modest spreads, so
they sit kindly on warm white. Cards default to a **hairline border + no
shadow**; on hover the border tightens and a small `elevation.md` shadow
blooms. Modals get `elevation.lg`. The hero banner gets `elevation.xl`.
Anything beyond `xl` is forbidden.

Focus is communicated as a **3-pixel `#D6002F33` glow ring** plus, on
critical actions, a 2-offset solid ring. Errors swap red for the
`elevation.focus-error` red. Focus is *always* communicated, but only on
`:focus-visible` so mouse-clicking doesn't leave a ring trail.

The hero photograph carries the highest depth in the system: a `60%` black
overlay sits between the image and the type. Below that, glassmorphic chips
add a second layer of depth via `backdrop-filter: blur(8px)` over the
photograph itself. Outside the hero, blur is never used.

## Shapes

The platform's signature gesture is the **full-pill button** —
`rounded.full` (`9999px`) — applied to primary, outline, ghost, neutral, and
category buttons alike. Pills paired with a cherry-red fill read as
confident and a touch festive without tipping into playful, which is the
tonal target.

Cards and content containers use **`rounded.md`** (12px). Inputs settle at
**`rounded.sm`** (8px); modals and the rich-text editor sit at
**`rounded.lg`** (16px). Badges and chips share the button's full-pill
shape. There are no sharp 90° corners anywhere except inside the
date-picker's range-middle days (intentional — it stitches the range
visually).

The card image area is a strict **3:2 ratio** with a `surface-muted`
placeholder for slow networks. The hero image is full-bleed, anchored to
`object-position: center 60%` to keep faces in frame on portrait crops.

## Components

**Buttons** are full pills, always uppercase label text. Primary is solid
red on white; outline is a 2px red border that fills on hover; neutral is a
2px gray border that shades; ghost is fill-only-on-hover; category is the
softer chip variant for filter-style picks. Pressing translates the button
1px down with a hint of scale-down (0.995) — fast, 100ms. Disabled buttons
drop to 50% opacity and lock the cursor.

**Cards** are an article tile: 3:2 image on top, category pill, then a
muted metadata row (`date · time · price · multi-day`), a 2-line title, and
finally a location row anchored to the bottom with a pin icon. The whole
tile is a clickable article element with the link absolutely positioned to
cover the card. Hovering tightens the border and zooms the image to 1.03
over 300ms. The favorite button overlays the image in the top-right and
heart-beats (1 → 1.15 → 1) on activation.

**Chips** have two contexts: on-light (white fill, hairline border, hover
shades to muted) and on-photo (glassmorphic over hero photography). The
active variant in on-photo flips to solid red with a leading check icon.

**Modals** on mobile take the full `100dvh` and read like a screen, not a
popup; on **sm+** they cap at 500px wide with a 16px-radius card. Header is
sticky (back arrow + centered uppercase title), footer is sticky and
safe-area-inset aware (single primary action button, full width). The
backdrop is the scrim color at 60%.

**Inputs** are 40px tall by default (48px in `input-large`), 8px corners,
`#CCCCCC` border. Focus glows red, error glows feedback-error. Range slider
thumbs are 24-px circles in primary red.

**Date picker** is a high-touch primitive: red selected days as solid
circles, a 6–8% red wash for range middles, a 35%-alpha red dashed border
on "today", and red chevrons. Days are 28×28 (filter context) or 36×36
(form context). Focus rings always render — even when `outline: none` is
set on the day button — via box-shadow.

**Footer** is a long, generous tower: a soft white→muted gradient, a social
row, a centered nav strip, a sponsor CTA card, a 2/3/4-column grid of
"agenda for [town]" links, and finally the copyright + tagline. Hr dividers
between blocks are 50%-alpha hairlines. The agenda links use a 4-px
underline-offset and a 2-px decoration thickness on hover — a quiet but
specific link signature.

**Navigation progress bar**: a 3px primary-red bar at the top of the page
during client-side route changes, replacing the spinner pattern.

**Motion**: the default easing is `cubic-bezier(0.4, 0, 0.2, 1)`. A
`bounce-subtle` easing exists but is reserved for confirmations —
favoriting an event, copying a share link. View Transitions fade the page
root: 90ms ease-in out, 210ms ease-out in (delayed 90ms). Every transition
collapses to 0ms under `prefers-reduced-motion: reduce`.

## Do's and Don'ts

**Do**

- Use `colors.primary` only for genuine calls-to-action, active states,
  focus, and price/price-free accents. Treat it as a scarce resource.
- Pair white type over photography with a `text-shadow` and a 60% overlay
  — never bare white on raw photography.
- Default cards to a hairline border and *no* shadow. Let shadow bloom on
  hover only.
- Pin form inputs to 16px+ to prevent iOS auto-zoom.
- Use `:focus-visible` (not `:focus`) for all focus rings.
- Keep mobile interactive targets at 44×44 px minimum.
- Mark hero subtitles with `data-speakable="description"` so voice
  surfaces can extract them.
- Use sentence case for body and metadata. Reserve UPPERCASE for buttons,
  nav labels, and small UI chrome.
- Use semantic feedback colors for their meaning only (success on free
  prices, warning on urgency, error on validation, info on system notes).

**Don't**

- Don't introduce a second brand color. The Catalan red is the system's
  only chromatic accent.
- Don't use `colors.primary` as a large fill behind body text; only at
  31% alpha or below for tints.
- Don't use pure black (`#000000`) for body copy. Body is `#454545`.
- Don't add webfonts. The system stack is a feature, not a placeholder.
- Don't introduce gradient meshes, mascots, or illustrated artwork. The
  imagery direction is documentary photography of Catalan culture.
- Don't ship dark mode tokens. The system is light-only by intent.
- Don't exceed `elevation.xl` shadows. There is no `elevation.2xl`.
- Don't synthesize bold weights — `font-synthesis` stays disabled.
- Don't use `bounce-subtle` easing for navigation, hovers, or page
  transitions. Reserve it for confirmation gestures only.
- Don't use blur outside the hero / photographic surfaces.
- Don't break the canonical hover pattern on cards (border tightens +
  shadow blooms + image scales 1.03). Stay consistent across the grid.
