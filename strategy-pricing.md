# Self-Service Sponsor Banner System

## Overview

A self-service local advertising system allowing businesses to sponsor place pages for €2-3/day. Uses **Stripe Payment Links** (no-code) with **external image URLs** and **manual JSON activation**.

**Target**: Event organizers, cultural venues, festivals, and local businesses wanting visibility in specific towns/regions.
**Scale**: 50,000+ visites anuals · 160,000+ sessions · Growing with SEO v2.

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

### Phase 1: Core Components

- [ ] **1. config/sponsors.ts** – Types + `getActiveSponsorForPlace(place)` helper

  - `SponsorConfig`: businessName, imageUrl, targetUrl, places[], startDate, endDate
  - Filter by date range (auto-expire) and place match
  - First match wins (no rotation)

- [ ] **2. components/ui/sponsor/SponsorBannerSlot.tsx** – Server component

  - Calls `getActiveSponsorForPlace(place)`
  - Renders responsive banner (any aspect ratio, max-height ~120px mobile / ~150px desktop)
  - `next/image` with `unoptimized={true}` for external URLs
  - Link with `rel="sponsored noopener"`
  - "Publicitat" label (EU ad transparency compliance)
  - `onError` fallback for broken images

- [ ] **3. components/ui/sponsor/SponsorEmptyState.tsx** – CTA component

  - "Anuncia't aquí" with exclusivity messaging
  - Links to `/patrocina`
  - Translated via i18n
  - Subtle, non-intrusive design

- [ ] **4. Integrate in PlacePageShell.tsx**
  - Render `<SponsorBannerSlot place={place} />` below heading, above events
  - Wrap in `Suspense` with `null` fallback

### Phase 2: Landing Page & Payments

- [ ] **5. messages/\*.json** – Add translation keys

  - `Sponsor.cta`, `Sponsor.label`, `Sponsor.emptyState`
  - `Patrocina.title`, `Patrocina.benefits`, `Patrocina.pricing`, etc.

- [ ] **6. app/patrocina/page.tsx** – Landing page

  - Benefits section (stats, local audience reach)
  - Pricing table
  - Stripe Payment Link buttons (external links)
  - Instructions: "Després del pagament, envia'ns la imatge i l'enllaç"
  - Contact: email/WhatsApp

- [ ] **7. Stripe Dashboard** – Create Payment Links (no code)
  - Products per tier (12 total):
    - **Població**: "3 dies" €3, "7 dies" €5, "14 dies" €8, "30 dies" €12
    - **Comarca**: "3 dies" €5, "7 dies" €8, "14 dies" €12, "30 dies" €20
    - **Catalunya**: "3 dies" €8, "7 dies" €12, "14 dies" €20, "30 dies" €35
  - Enable "Collect customer email"
  - Add custom fields: "Nom del negoci" + "Població, comarca o Catalunya"

### Phase 3: Testing

- [ ] **8. Add test sponsor entry** in config/sponsors.ts
- [ ] **9. Verify banner renders** on place pages
- [ ] **10. Verify empty state CTA** when no sponsor
- [ ] **11. Verify date filtering** (expired sponsors hidden)
- [ ] **12. Test broken image fallback**

---

## Manual Activation Workflow

1. Receive Stripe payment notification (email + Dashboard)
2. Get customer email + "Nom del negoci" + "Població/comarca/Catalunya" from Stripe
3. Email customer requesting: image URL + target link URL (if not provided)
4. Add entry to `config/sponsors.ts`:
   ```typescript
   {
     businessName: "Restaurant Example",
     imageUrl: "https://example.com/banner.jpg",
     targetUrl: "https://example.com",
     places: ["mataro"],           // or ["maresme"] for comarca, or ["catalunya"] for country
     geoScope: "town",             // "town" | "region" | "country"
     startDate: "2026-01-15",
     endDate: "2026-01-22",
   }
   ```
5. `git commit && git push` → deploy (~2 min)
6. Confirm to customer via email

---

## Technical Decisions

| Decision                | Choice                          | Rationale                               |
| ----------------------- | ------------------------------- | --------------------------------------- |
| Image hosting           | External URL (sponsor provides) | Zero friction, no upload complexity     |
| Image dimensions        | Any aspect ratio                | Sponsors use existing assets            |
| Payment provider        | Stripe Payment Links            | Cheapest (1.5% + €0.25), no-code        |
| Data storage            | JSON config file                | No backend work, version controlled     |
| Activation              | Manual                          | 2 min/activation, human quality control |
| Multiple sponsors/place | First match wins                | Simple, manual conflict resolution      |
| Tracking                | None (MVP)                      | Add when scale justifies                |
| Geo scope tiers         | Town / Region / Catalunya       | Matches user mental model (Wallapop)    |

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
- [ ] Stripe webhook → auto-activation
- [ ] Click/impression tracking
- [ ] Category-specific sponsorship (e.g., sponsor only "música" pages)
- [ ] Sponsor rotation for same place
- [ ] Self-service image upload
- [ ] Admin dashboard
- [ ] Event organizer bundle (publish + promote)

---

## Files to Create/Modify

| File                                          | Action            |
| --------------------------------------------- | ----------------- |
| `config/sponsors.ts`                          | Create            |
| `types/sponsor.ts`                            | Create            |
| `components/ui/sponsor/SponsorBannerSlot.tsx` | Create            |
| `components/ui/sponsor/SponsorEmptyState.tsx` | Create            |
| `components/ui/sponsor/index.ts`              | Create            |
| `components/partials/PlacePageShell.tsx`      | Modify            |
| `messages/ca.json`                            | Modify            |
| `messages/es.json`                            | Modify            |
| `messages/en.json`                            | Modify            |
| `app/patrocina/page.tsx`                      | Create            |
| `app/patrocina/layout.tsx`                    | Create (optional) |

```

```
