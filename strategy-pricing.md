# Self-Service Sponsor Banner System

## Overview

A self-service local advertising system allowing businesses to sponsor place pages for €2-3/day. Uses **Stripe Checkout API** with **self-service image upload** and **webhook-based activation**.

**Target**: Event organizers, cultural venues, festivals, and local businesses wanting visibility in specific towns/regions.
**Scale**: 50,000+ visites anuals · 160,000+ sessions · Growing with SEO v2.

---

## Current Implementation Status

✅ **Fully Implemented:**
- Dynamic Stripe Checkout Sessions via API (`/api/sponsors/checkout`)
- Self-service image upload after payment (`/patrocina/upload`)
- Stripe webhook handler for payment confirmation (`/api/sponsors/webhook`)
- Three-tier pricing (Town/Region/Catalunya)
- Landing page with interactive pricing (`/patrocina`)
- Place selector with search (towns, regions, Catalunya)

🔄 **Semi-Automated Workflow:**
1. Customer selects place + duration on `/patrocina`
2. Stripe Checkout Session created dynamically
3. After payment, customer uploads banner image on `/patrocina/upload`
4. Webhook receives payment confirmation
5. Manual activation in `config/sponsors.ts` (image URL from S3)

---

## User Journey Analysis

**Discovery paths to `/patrocina`:**

| User State                   | Discovery Method  | Notes                               |
| ---------------------------- | ----------------- | ----------------------------------- |
| Visits place WITHOUT sponsor | Empty state CTA   | Primary path - prominent            |
| Visits place WITH sponsor    | Footer navigation | Low-effort backup                   |
| Any page                     | Footer navigation | Always accessible                   |
| Direct search                | Google/URL        | SEO for "anunciar-se esdeveniments" |

**Design decision:** When a sponsor is active, their banner is 100% theirs - no secondary "advertise here" links that would disrespect paying customers by advertising to their competitors. Discovery for sponsored places relies on footer link (low-effort backup) and direct outreach.

---

## Pricing

Three visibility tiers based on geographic scope:

| Duration | Població (Town) | Comarca (Region) | Catalunya (Country) |
| -------- | --------------- | ---------------- | ------------------- |
| 3 days   | €3              | €5               | €8                  |
| 7 days   | €5              | €8               | €12                 |
| 14 days  | €8              | €12              | €20                 |
| 30 days  | €12             | €20              | €35                 |

**Reference benchmark**: Wallapop charges €1.25-2.50 for 7-day visibility boosts. We're slightly higher because our audience is intent-driven (actively searching for local events).

**Tier logic**:

- **Població**: Single town page (e.g., `/mataro`) — smallest, most targeted audience
- **Comarca**: Region page (e.g., `/maresme`) — covers 10-30 towns
- **Catalunya**: Homepage (`/`) — entire site traffic, maximum visibility

Minimum €3 (impulse-buy friendly). Cultural events are time-sensitive – shorter durations match sponsor needs.

**Stripe fees impact** (1.5% + €0.25):

- €3 sale → €0.30 fee (9.8%) → you keep €2.70
- €5 sale → €0.33 fee (6.5%) → you keep €4.67
- €35 sale → €0.78 fee (2.2%) → you keep €34.22

---

## Implementation Checklist

### Phase 1: Core Components ✅

- [x] **1. types/sponsor.ts** – Types + constants

  - `GeoScope`, `SponsorDuration`, `PlaceOption`, `SponsorConfig`
  - `DURATION_DAYS`, `VALID_GEO_SCOPES` constants
  - Checkout request/response types

- [x] **2. config/sponsors.ts** – Sponsor data + `getActiveSponsorForPlace(place)` helper

  - `SponsorConfig`: businessName, imageUrl, targetUrl, places[], startDate, endDate, geoScope
  - Filter by date range (auto-expire) and place match
  - First match wins (no rotation)

- [x] **3. components/ui/sponsor/SponsorBannerSlot.tsx** – Server component

  - Calls `getActiveSponsorForPlace(place)`
  - Renders responsive banner (any aspect ratio, max-height ~120px mobile / ~150px desktop)
  - `next/image` with `unoptimized={true}` for external URLs
  - Link with `rel="sponsored noopener"`
  - "Publicitat" label (EU ad transparency compliance)
  - `onError` fallback for broken images

- [x] **4. components/ui/sponsor/SponsorEmptyState.tsx** – CTA component

  - "Anuncia't aquí" with exclusivity messaging
  - Links to `/patrocina`
  - Translated via i18n
  - Subtle, non-intrusive design

- [x] **5. Integrate in PlacePageShell.tsx**

  - Render `<SponsorBannerSlot place={place} />` below heading, above events
  - Wrap in `Suspense` with `null` fallback

- [x] **5b. Add `/patrocina` to footer navigation**
  - Added entry with translations

### Phase 2: Landing Page & Payments ✅

- [x] **6. messages/\*.json** – Translation keys

  - `Sponsor.cta`, `Sponsor.label`, `Sponsor.emptyState`
  - `Patrocina.*` namespace with all landing page content

- [x] **7. app/patrocina/page.tsx** – Landing page

  - Benefits section with icons (audience, exclusivity, stats)
  - Interactive pricing section with place selector
  - Dynamic pricing based on geo scope (town/region/country)
  - FAQ section with JSON-LD schema
  - Step-by-step "How it works" section

- [x] **8. components/ui/sponsor/PricingSectionClient.tsx** – Client component

  - Place selector integration
  - Dynamic price display based on selected place
  - Checkout button per duration

- [x] **9. components/ui/sponsor/PlaceSelector.tsx** – Place search

  - Search towns, regions, and Catalunya option
  - Fetches from `/api/places` and `/api/regions`
  - Displays geo scope badges

- [x] **10. app/api/sponsors/checkout/route.ts** – Stripe Checkout API

  - Creates dynamic Checkout Sessions (not Payment Links)
  - Idempotency key from visitor_id + params
  - Metadata for webhook processing
  - Custom fields for business name

- [x] **11. app/api/sponsors/webhook/route.ts** – Stripe webhook handler

  - Verifies Stripe signature (timing-safe)
  - Handles `checkout.session.completed`
  - Handles `checkout.session.expired`
  - Copies metadata to PaymentIntent for later retrieval

- [x] **12. app/patrocina/upload/page.tsx** – Self-service image upload

  - Validates Stripe session ID from URL
  - Confirms payment status before allowing upload
  - Uploads to S3 via existing event image infrastructure
  - Success/error states with next steps

- [x] **13. lib/stripe/** – Stripe utilities

  - `api.ts`: REST API helpers (no SDK)
  - `checkout-helpers.ts`: Line item, custom field, metadata builders
  - Session fetching and metadata updates

### Phase 3: Testing ✅

- [x] **14. Test sponsor entry** in config/sponsors.ts
- [x] **15. Banner renders** on place pages
- [x] **16. Empty state CTA** when no sponsor
- [x] **17. Date filtering** (expired sponsors hidden)
- [x] **18. Broken image fallback**
- [x] **19. Checkout flow** end-to-end
- [x] **20. Webhook signature verification**

---

## Current Activation Workflow

1. Customer completes purchase on `/patrocina` → Stripe Checkout
2. After payment, redirected to `/patrocina/upload?session_id=...`
3. Customer uploads banner image (validates paid session)
4. Image uploaded to S3 via existing event image infrastructure
5. Webhook logs payment details (business name, place, duration, email)
6. Admin receives notification, retrieves S3 image URL
7. Add entry to `config/sponsors.ts`:
   ```typescript
   {
     businessName: "Restaurant Example",
     imageUrl: "https://s3.amazonaws.com/bucket/sponsors/xxx.jpg",
     targetUrl: "https://example.com",
     places: ["mataro"],           // or ["maresme"] for comarca, or ["catalunya"] for country
     geoScope: "town",             // "town" | "region" | "country"
     startDate: "2026-01-15",
     endDate: "2026-01-22",
   }
   ```
8. `git commit && git push` → deploy (~2 min)
9. Confirm to customer via email

---

## Technical Decisions

| Decision                | Choice                          | Rationale                               |
| ----------------------- | ------------------------------- | --------------------------------------- |
| Image hosting           | S3 (self-service upload)        | Customer uploads after payment          |
| Image dimensions        | Any aspect ratio                | Sponsors use existing assets            |
| Payment provider        | Stripe Checkout API             | Dynamic sessions, custom fields, webhooks |
| Data storage            | JSON config file                | No backend work, version controlled     |
| Activation              | Semi-automated                  | Customer uploads, admin activates       |
| Multiple sponsors/place | First match wins                | Simple, manual conflict resolution      |
| Tracking                | None (MVP)                      | Add when scale justifies                |
| Geo scope tiers         | Town / Region / Catalunya       | Matches user mental model (Wallapop)    |
| Stripe SDK              | None (REST API only)            | Zero dependencies, smaller bundle       |

---

## Compliance

- **EU Ad Transparency**: "Publicitat" label on all banners
- **SEO**: `rel="sponsored noopener"` on all sponsor links
- **Privacy**: No tracking pixels, no cookies from sponsors

---

## Messaging Strategy

**Key selling points (for landing page & CTA):**

- "50,000+ visites anuals" – impressive, true
- "Espai exclusiu – només 1 patrocinador per zona" – scarcity/exclusivity
- "Arriba al teu públic local exacte" – precise targeting
- "Des de 3€" – ultra-low barrier impulse buy
- "Tria el teu abast: població, comarca o tot Catalunya" – control over reach
- "Sense contractes – paga només quan vulguis" – no commitment

**Tone:** Professional but accessible. Local business friendly, not corporate.

---

## Expectations & Goals

**Year 1 (realistic):**

- Revenue: €300-500 (5-15 sponsors)
- Purpose: Market validation, not primary income
- Learning: What sponsors want, pricing sensitivity, which places sell

**Success metrics:**

- ✅ At least 1 paying sponsor = validated demand
- ✅ Infrastructure ready for traffic growth
- ✅ Learnings documented for future iteration

**This is market research infrastructure, not a business model yet.**

---

## Landing Page Copy Outline (`/patrocina`)

### Hero

- **Headline:** "Fes visible el teu negoci a la teva comarca"
- **Subhead:** "Arriba a milers de persones que busquen què fer al teu poble"
- **CTA:** "Veure preus"

### Benefits Section

1. **Audiència local exacta** – "Els teus clients potencials, buscant activitats al teu poble"
2. **Espai exclusiu** – "Només 1 patrocinador per població – sense competència"
3. **Sense complicacions** – "Envia'ns la imatge i nosaltres ho fem tot"
4. **Flexible** – "Des de 3 dies – ideal per events puntuals"

### Pricing Table

- Show 3 scope tabs (Població / Comarca / Catalunya)
- 4 duration options per scope with "Més popular" badge on 7 days
- Each with Stripe Payment Link button

### How It Works

1. Tria la durada i paga
2. Envia'ns la imatge i l'enllaç
3. Activem el teu anunci en 24h

### FAQ

- "Quina mida ha de tenir la imatge?" → Qualsevol, recomanem horitzontal
- "Puc triar el poble?" → Sí, tria entre població, comarca o tot Catalunya
- "Quan s'activa?" → En menys de 24h laborables
- "Quina diferència hi ha entre els 3 nivells?" → Població = 1 poble, Comarca = ~20 pobles, Catalunya = tot el web

### Contact

- Email + WhatsApp for questions

---

## Future Improvements (Post-MVP)

- [ ] Notion/Airtable integration for near-instant activation
- [ ] Auto-activation from webhook (no manual config edit)
- [ ] Click/impression tracking
- [ ] Category-specific sponsorship (e.g., sponsor only "música" pages)
- [ ] Sponsor rotation for same place
- [ ] Admin dashboard for sponsor management
- [ ] Event organizer bundle (publish + promote)
- [ ] Target URL collection during checkout (custom field)
- [ ] Email notifications to admin on new purchases

---

## Files Created/Modified

| File                                               | Status   |
| -------------------------------------------------- | -------- |
| `types/sponsor.ts`                                 | ✅ Created |
| `config/sponsors.ts`                               | ✅ Created |
| `config/pricing.ts`                                | ✅ Created |
| `components/ui/sponsor/SponsorBannerSlot.tsx`      | ✅ Created |
| `components/ui/sponsor/SponsorEmptyState.tsx`      | ✅ Created |
| `components/ui/sponsor/PricingSectionClient.tsx`   | ✅ Created |
| `components/ui/sponsor/PlaceSelector.tsx`          | ✅ Created |
| `components/ui/sponsor/CheckoutButton.tsx`         | ✅ Created |
| `components/ui/sponsor/SponsorUploadPageClient.tsx`| ✅ Created |
| `components/ui/sponsor/index.ts`                   | ✅ Created |
| `components/partials/PlacePageShell.tsx`           | ✅ Modified |
| `messages/ca.json`                                 | ✅ Modified |
| `messages/es.json`                                 | ✅ Modified |
| `messages/en.json`                                 | ✅ Modified |
| `components/ui/common/footer/index.tsx`            | ✅ Modified |
| `app/patrocina/page.tsx`                           | ✅ Created |
| `app/patrocina/upload/page.tsx`                    | ✅ Created |
| `app/patrocina/success/page.tsx`                   | ✅ Created |
| `app/patrocina/cancelled/page.tsx`                 | ✅ Created |
| `app/api/sponsors/checkout/route.ts`               | ✅ Created |
| `app/api/sponsors/webhook/route.ts`                | ✅ Created |
| `app/api/sponsors/image-upload/route.ts`           | ✅ Created |
| `lib/stripe/api.ts`                                | ✅ Created |
| `lib/stripe/checkout-helpers.ts`                   | ✅ Created |
| `lib/stripe/index.ts`                              | ✅ Created |
