# Promotions MVP – Featured/Promoted Events and Businesses

## 1) Scope and Goals
- Add a simple, frontend‑first system to surface “Featured/Promoted” items in multiple placements without backend changes.
- Provide a purchase path for “Business” promotions using Stripe Checkout (no backend yet).
- Keep SEO clean (do not include promoted items in JSON‑LD).
- Reuse existing UI components, keep code small and flag‑gated.

## 2) What’s Implemented
### 2.1 Placements (flag‑gated by `NEXT_PUBLIC_FEATURE_PROMOTED`)
- Home (`app/page.tsx`)
  - “Destacats” strip (existing)
  - New “Empreses destacades” strip below main sections
- Home categories (`components/ui/serverEventsCategorized/index.tsx`)
  - “Empreses destacades” strip below `LocationDiscoveryWidget`
  - Link “Promociona la teva empresa” near each category header
- Place pages (`app/[place]/page.tsx`)
  - Bottom strip “Empreses de proximitat” under `HybridEventsList`
- Event detail (`app/e/[eventId]/page.tsx`)
  - “Empreses recomanades a prop” strip after `EventClient` (scoped by region)
- Event detail CTA (`app/e/[eventId]/EventClient.tsx`)
  - Inline card “Promociona el teu esdeveniment” now links to `/promociona?eventId=<slug>`

Notes:
- All strips use `EventsAroundServer` with `showJsonLd=false` to avoid SEO pollution.
- Strips hide automatically if fewer than 3 items are available.

### 2.2 Promotions configurator (`/promociona`)
- Selectors: Tipus (Esdeveniment/Negoci), Àrea de visibilitat (Regió/Ciutat/País), Durada (2/7/15 dies), Ubicació (Catalunya + region/city pickers).
- Uses existing `Select` and hooks to list regions/cities (same model as `/publica`).
- Conditional behavior:
  - País → Region and City disabled
  - Regió → City disabled
  - Ciutat → both enabled
- Price calculation: from constants (`PROMOTE_PRICING` × `PROMOTE_PLACEMENT_MULTIPLIER`, future‑proof for backend).
- For kind=business → checkout; kind=event → `/publica` (no payment now). 

### 2.3 Stripe (server‑only Checkout redirect)
- Route: `app/promociona/checkout/route.ts`
  - Creates a Checkout Session from URL params and redirects to Stripe
  - Success → `/promociona/success?session_id=...`
  - Cancel → back to `/promociona?canceled=1`
  - Safe fallback when `STRIPE_SECRET_KEY` missing → returns to `/promociona?stripe=missing`
- Success page: `app/promociona/success/page.tsx`
  - Simple confirmation and GA event `checkout_success`
- CTA wrapper: `app/promociona/cta-client.tsx`
  - Fires GA `begin_checkout` when the user clicks the button

### 2.4 Feature flag and constants
- `NEXT_PUBLIC_FEATURE_PROMOTED` gates all strips and CTAs
- `utils/constants.ts`:
  - `PROMOTE_VISIBILITY` (zona/regió, ciutat, país)
  - `PROMOTE_DURATIONS` (2/7/15)
  - `PROMOTE_PRICING` (base prices)
  - `PROMOTE_KINDS` (event, business)
  - `PROMOTE_PLACEMENTS` + `PROMOTE_PLACEMENT_MULTIPLIER` (future use)

## 3) What’s Left (Frontend‑only)
- Add banners on `/promociona` for:
  - `?canceled=1` → “Pagament cancel·lat”
  - `?stripe=missing` → “Stripe no configurat” (warning already added when env missing)
- Expose “Promociona la teva empresa” links in other low‑risk surfaces (footer partners, location widget card) if desired.
- Optional: GA events on impression/click for the new strips.

## 4) Backend Needs (when ready)
- Dedicated Promotions API
  - Data model: Promotion, Creative (image), Targeting (place/category), Kind (business/event), Scope/Duration/Placement, Start/End, Status
  - Endpoints:
    - `GET /promotions?place=...&category=...` (for strip rendering)
    - `POST /promotions` (create pending)
    - `PUT /promotions/:id` (activate/modify)
- Fulfillment logic (after payment)
  - Start/end scheduling for visibility windows
  - Slot allocation/inventory limits per surface
  - Creative validation and safe asset hosting

## 5) Stripe: Now vs Later
### 5.1 Why no webhooks now
- We are not auto‑fulfilling in the backend yet. The MVP flow ends at the success page.
- Stripe Dashboard can be used for reconciliation in test/live.

### 5.2 When to add webhooks
- As soon as we need to automatically activate/schedule a promotion, store orders, or send onboarding messages. 
- Listen to `checkout.session.completed` (and optionally `payment_intent.succeeded`) and persist the confirmed order.

### 5.3 Products/Prices migration (preferred for production)
- Replace code‑computed amounts with Stripe Products + Prices.
- Model each combination (scope × days × placement) as a Price (use `lookup_key`).
- Checkout Session uses line_items with `price: <price_id>` and `quantity: 1`.
- Benefits: single source of truth for pricing, simpler ops, flexible discounts/taxes, cleaner reporting.

## 6) Environment & Config
- Required now:
  - `NEXT_PUBLIC_FEATURE_PROMOTED=1` (to reveal UI/strips)
  - `STRIPE_SECRET_KEY` (test/live; required for business checkout)
- Optional later:
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (if using client SDK)
- Vercel Preview/Production: set env per environment, redeploy.

## 7) SEO, Ads, Compliance Rules
- Do NOT include promoted items in JSON‑LD: every strip sets `showJsonLd=false`.
- Clearly label Sponsored/Promoted items.
- External links should use `rel="sponsored nofollow noopener noreferrer"` (when external URLs are introduced).
- Keep canonical URLs unchanged; the promotions page `/promociona` is static and not indexed for content discovery.

## 8) Analytics
- Implemented: GA events
  - `begin_checkout` on checkout CTA
  - `checkout_success` on success page
- Suggested next:
  - `promoted.strip_impression` (IntersectionObserver)
  - `promoted.item_click` with `{ placement, pageType, place, category, position, kind }`

## 9) Testing & Validation (manual)
- Flag OFF → All strips hidden; `/promociona` still works (without Stripe notice).
- Flag ON, Stripe missing → `/promociona` shows a warning; checkout redirects back with `stripe=missing`.
- Stripe Test Key → Business: `/promociona` → checkout → pay with test card → success page.
- Event promotion: `/promociona?kind=event` → `/publica` flow unchanged.

## 10) Open Questions
- Inventory rules per placement (how many promos at once?).
- Targeting granularity (place vs place+category, date windows). 
- Creative specs per placement (ratio/size caps; image moderation). 
- Pricing strategy and bundles (newsletter mentions, co‑branded content add‑ons).

## 11) File/Code Map
- Home strips: `app/page.tsx`, `components/ui/serverEventsCategorized/index.tsx`
- Place strips: `app/[place]/page.tsx`
- Event detail strip: `app/e/[eventId]/page.tsx`
- Promotions page: `app/promociona/page.tsx`
  - Place picker: `app/promociona/place-client.tsx`
  - Business upload (preview only): `app/promociona/upload-client.tsx`
  - Checkout CTA: `app/promociona/cta-client.tsx`
- Stripe server route: `app/promociona/checkout/route.ts`
- Success page: `app/promociona/success/page.tsx`
- Constants: `utils/constants.ts`

## 12) Wrap‑up
- MVP is complete: featured/promoted placements are visible under a flag, `/promociona` configures options with location targeting, and business checkout uses Stripe Checkout without backend.
- Next recommended steps: move prices to Stripe Products/Prices, add Stripe webhooks and a minimal Promotions backend to schedule and track active promotions.