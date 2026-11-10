# Ticketing for small venues: viability (2026-11-09)

Idea: sell tickets for small venues (checkout, QR ticket by email, door
scanner) and earn a small fee per ticket. **Verdict: parked.** The fee model
needs organisers and buyers we don't have yet. The build plan below is ready
for when the triggers in section 5 are met. Numbers age fast: re-run the
checks in section 6 before you act on them.

## 1. Our data (to 2026-11-09)

Traffic caveats (bots, consent, Zaraz) are in
[paid-acquisition-research-2026-11.md](./paid-acquisition-research-2026-11.md).
GA4 is filtered to Spain and is a lower bound.

| Metric                                      | Value                                                                                                   | Source                             |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Upcoming events                             | 4,067: 2,024 `MANUAL`, 1,439 `RSS`, 604 `SCRAPE`                                                        | `GET /api/events` (all pages)      |
| Events with an owner (self-serve organiser) | **2 of 2,024** `MANUAL` events                                                                          | `GET /api/events/{slug}` → `owner` |
| Events published by users, last 30 days     | 5 `publish_success` (5 users)                                                                           | GA4                                |
| Users, last 30 / 90 days                    | 1,698 / 4,661                                                                                           | GA4                                |
| Event page views, last 30 days              | 1,150 `view_event_page`                                                                                 | GA4                                |
| Outbound clicks, last 30 days               | **161** `outbound_click`                                                                                | GA4                                |
| Promote page views, last 30 days            | 1                                                                                                       | GA4                                |
| Visits per event (lifetime counter)         | median 45, p90 139, max 483                                                                             | `visits` field                     |
| Events that look paid                       | ~234 (6%), from prices in the description. The `price` field is empty everywhere                        | regex on `description`             |
| Venues of those paid events                 | Mostly big ones: Razzmatazz 21, Palau de la Música 19, Palau Sant Jordi 13, Sant Jordi Club 10, Apolo 7 | `location`                         |
| Event URLs on ticket sites                  | 89: Ticketmaster 25, entradas.com 13, DICE 10, Onebox 8, Enterticket 7, Koobin 4, others ≤ 4            | `url` domains                      |

The big paid venues already sell through contracted platforms (Ticketmaster,
DICE, Onebox). The small venues this product targets barely appear yet.

## 2. Revenue estimate (€0.50 per ticket)

- **Sales from our own visitors:** 161 outbound clicks × ~30% on paid events
  × ~10% conversion ≈ 5 tickets ≈ **€3–5/month**. At 3× real traffic (consent
  gap), still under €20/month.
- **Sales from the venue's own audience:** a small venue with 4 events × 80
  tickets = 320 tickets ≈ €160/month. €1,000/month needs ~2,000 tickets/month,
  about 6–7 venues that move all their sales to us. Today we have 2
  self-serve organisers.
- **Price to the venue:** our €0.50 plus Stripe's 1.5% + €0.25 (≈ €0.43 on a
  €12 ticket) ≈ €0.93 per ticket. Ticket Tailor is ~£0.60 flat plus Stripe;
  Ticketing.cat is 4%. No price edge.
- **Costs:** ~8–10 weeks of build, event-night support, €20 per Stripe
  dispute, a gestor for tax and invoicing.

Revenue comes from organisers who already have buyers. That's a sales job
(signing venues), not a tech job.

## 3. Outside facts (checked 2026-11-09)

**Stripe Spain** ([pricing](https://stripe.com/es/pricing)):

- Standard EEA cards: 1.5% + €0.25.
- Premium EEA cards: 2.8% + €0.25.
- UK cards: 2.5% + €0.25.
- International cards: 3.15% + €0.25.
- Bizum: 1.5% + €0.25, Connect supported
  ([docs](https://docs.stripe.com/payments/bizum)).
- Disputes: €20 each.

**Stripe Connect** ([pricing](https://stripe.com/es/connect/pricing)):

- "Stripe handles pricing": no platform fee.
- "You handle pricing": €2 per active account per month, plus 0.25% + €0.10
  per payout.
- Cheapest for us: direct charges plus `application_fee_amount`. The venue is
  the seller and carries the dispute risk.
- Standard, Express and Custom are now "legacy" account types. New platforms
  use the controller properties or the Accounts v2 API
  ([docs](https://docs.stripe.com/connect/accounts)).

**Competitors:**

| Platform                               | Fee                                                   |
| -------------------------------------- | ----------------------------------------------------- |
| Eventbrite ES                          | 6% (Essentials) or 9% + €0.19 (Pro); free events free |
| Ticket Tailor                          | £0.22–0.60 flat per ticket; 5,000 free tickets/year   |
| Billetto                               | 3.99% + €0.90                                         |
| Xceed                                  | free plan, then €29–59/month                          |
| Ticketing.cat                          | 4% + IVA                                              |
| Koobin, Fourvenues, DICE, Ticketmaster | no public price                                       |

**Affiliate option:** Ticketmaster.es has a programme on impact.com
(~€0.80 per sale, 30-day cookie). This comes from a secondary source
(revshare.so); check it on impact.com before relying on it.

**Law and tax:**

- IVA on live cultural shows is **10%** (Ley 37/1992 art. 91.Uno.2.6º).
  Whether DJ or club nights count is unclear; ask for a _consulta
  vinculante_.
- No right of withdrawal for dated leisure events (Directive 2011/83/EU art.
  16(l); TRLGDCU art. 103 l)).
- Under Llei 11/2009, the venue must refund if the show is cancelled or
  substantially changed, must not charge above the advertised price, and must
  not sell over capacity.
- **Verifactu** applies from 1 Jan 2027 (companies) and 1 Jul 2027
  (autónomos), per RD-ley 15/2025.
- As a mediator (selling in the venue's name), we invoice only our fee; the
  venue invoices the ticket. Confirm with a tax adviser.

**QR scanning:**

- `BarcodeDetector` works on Chrome Android and Samsung Internet only. It's
  off in Safari/iOS and missing in Firefox, so use the
  [`barcode-detector`](https://github.com/Sec-ant/barcode-detector) polyfill
  or `zxing-wasm`.
- `html5-qrcode` and `qr-scanner` are unmaintained.

**Wallet passes (later):**

- Apple Wallet needs the Apple Developer Program (99 USD/year).
- Google Wallet issuer access: no published fee found.

## 4. Build plan (when unparked)

Build it in **esdeveniments-backend**, not Turso. The backend already has what
this needs:

- **`checkout` module:** Stripe Java SDK, the `PromotionPaymentGateway`
  interface, `PromotionOrder` with statuses (`PENDING → PAID → REFUNDED`) and
  an idempotency key.
- **Stripe webhook:** `StripeWebhookController` checks signatures, routes by
  `metadata.purpose` and stores processed events in
  `promotion_webhook_receipt`.
- **Reconciliation:** `PromotionReconciliationService` runs every 60 s.
- **Access control:** `USER`, `ORGANIZATION` and `ADMIN` roles, and the
  owner-or-admin check in `EventCrudService`.
- **Email:** SMTP through `JavaMailSender`. `EmailServiceImpl` logs and
  swallows failures, so tickets need an outbox table and a retry job.
- **Database:** Postgres. A conditional `UPDATE … WHERE sold + n <= capacity`
  prevents overselling.

The frontend stays thin:

- A `lib/api/tickets-external.ts` wrapper using `fetchWithHmac`, like
  `lib/api/promotions.ts`.
- A buy page and a scanner page, both private and `no-store`.
- No `searchParams` reads on listing pages.
- New `/api/*` routes behind the API gate.
- A CDN purge when an event sells out.

Phases:

1. **Free sign-ups with QR check-in (~3 weeks).** No money moves.
   - Tables `ticket_type`, `ticket_order`, `ticket` (next Flyway migration).
   - Each QR holds the ticket id plus an HMAC signature, so fakes are
     rejected offline.
   - Tickets go out by email, through the outbox.
   - The scanner page works offline: it downloads the guest list, syncs
     check-ins later, and warns "already scanned at …".
   - It also has a manual name search for when the camera fails.
2. **Paid tickets (~4 weeks).**
   - Stripe Connect onboarding for venues, with direct charges plus
     `application_fee`.
   - Add a `"ticket"` purpose to the existing webhook.
   - Unpaid holds expire through the reconciliation job.
   - Refunds from the organiser view.
3. **Later:** Wallet passes, discount codes, attendee export. Leave seat maps
   out as long as possible.

## 5. Triggers to unpark

Revisit ticketing when any of these is true:

- At least 50 organisers publish events each month.
- At least 20 venues join a waitlist from a "Sell tickets with us" button.
  The button is a one-day build reusing the `app/api/leads/restaurant` lead
  pattern.
- A venue partner commits to moving its sales.

Until then:

- Grow traffic and organisers (see the growth doc). That's the limit on every
  revenue idea.
- Optionally add affiliate links on events that already link to ticket sites.
  The income would be small.
- Branch `feat/event-price-form` adds a price to the event form. Once it
  ships, measure paid events with the `price` field instead of the
  description regex.

## 6. How to re-run the checks

- **Events:** page `https://www.esdeveniments.cat/api/events?page=N&size=50`
  (`totalPages` in the response). Count `origin` and `url` domains.
- **Owners and price:** `GET https://www.esdeveniments.cat/api/events/{slug}`
  gives `owner` and `price`. Use 6 parallel requests at most against
  production.
- **GA4:**
  `python3 scripts/ga-dashboard.py --days 30 --all --country Spain`
  (gcloud ADC auth). Check `outbound_click`, `view_event_page`,
  `publish_success` and `promote_page_view`.
