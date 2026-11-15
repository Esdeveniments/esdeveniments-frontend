# Path to #1 cultural agenda in Catalonia: data and 80/20 bets (2026-11-15)

Having all 947 town URLs or scraping thousands of events will not make
`esdeveniments.cat` the top agenda in Catalonia on its own. `vine.cat` already
lists 970 events today across 325 towns and appears on 0 of 15 Google result
pages (`competitor-features-research-2026-11.md`), while `femturisme.cat`
appears on 12 of 15. Winning takes structured upstream supply paired with
high-density, trilingual (`ca`/`es`/`en`), evergreen pages and `.cat`
backlinks.

This doc records the evaluation of the 10-turn product brainstorm (Local
Guides, municipal scraping, behavioural personalisation), the live gaps
measured on 2026-11-15, and six 80/20 bets ordered by return per hour of work.

## 0. Sources and limits

| Source | What and when | Limits |
| --- | --- | --- |
| Production API | `/api/places` and `/api/events` across 13 major cities + 150-event sample, 2026-11-15 | Public summary DTO (`size` capped at 50 per page) |
| GA4 Data + Admin API | Property `406884331`, `country = Spain`, 2026-10-18 to 2026-11-14 (28 days) | Consent Mode v2 floor; raw un-filtered GA4 is ~75 to 80% bots |
| Search Console API | `sc-domain:esdeveniments.cat`, top 5,000 pages by locale and route type, 2026-08-15 to 2026-11-12 (90 days) | Top-5,000 page slice; anonymised queries excluded |
| Generalitat Open Data | `analisi.transparenciacatalunya.cat` Socrata dataset `rhpv-yr4f`, queried live on 2026-11-15 | Covers events reported to Departament de Cultura |
| Diputació de Barcelona | `do.diba.cat` / `opendata-api.diba.cat` catalog, checked 2026-11-15 | Barcelona province only |
| Competitor pages | `vine.cat` home and `/explora/granollers/` fetched live on 2026-11-15; 15 Google SERPs from `competitor-features-research-2026-11.md` | No internal traffic numbers for competitors |
| Codebase audit | `que-fer` (frontend), `esdeveniments-backend` (Spring Boot), and `cultural-agenda-sync` (`Esdeveniments/cultural-agenda-sync`, checked out locally under `gencat-cultural-agenda` at `15d74a9`), read on 2026-11-15 | Local checkouts |
| Product brainstorm | Full 10-turn ChatGPT thread *Proposta de guies d'esdeveniments* (`6af730a4-44a0-83eb-893c-fb9e7b12cb6c`), 2026-11-15 | External brainstorm without repo or GA4 access |
| Secondary critique | Independent review by Claude Opus 5.5 (`rubber-duck`) against all 3 repos and live feeds, 2026-11-15 | Incorporated into §3, §4, and §5 |

## 1. What the product brainstorm got right and wrong

### 1.1 User-curated lists and "Local Guides" (Turns 1 to 4): skip

 GA4 Spain counted 1,740 active users in 28 days, 138 returning users (8%), 11
logins (`auth_success`), and 5 saved events (`favorite_add`, 4 users). Public
user lists hit an empty-room trap at this volume, and weekend lists rot every
Monday.

### 1.2 Features proposed in Turns 5 to 8 that we already ship or ruled out

- **Already live in production:** town and comarca pages
  (`/<place>/<date>/<category>`), radius filter (`distance`, `lat`, `lon`),
  interactive map (`EventsMapToggle`), `gratis`/`pagament` filter, `/preferits`
  (cookie and account), `/publica`, Festa Major and seasonal hubs
  (`/festes-majors`, `/festa-major/<place>`, `/fires-de-nadal`, `/carnaval`),
  self-serve sponsorships (`/patrocina`), public API and MCP.
- **"Què fer si plou" / indoor-outdoor filter:** Keyword Planner shows 0 to 10
  searches/month in Spain and Search Console recorded 8 impressions in 90 days.
  0% of our events carry an indoor/outdoor field. Skip.
- **Push and smart alert engine:** Push opt-in showed 408 times, got 326
  dismissals and 0 sign-ups (`push_optin_success = 0`). Telegram has 7 members.
  Test a plain email input on weekend pages before building any alert worker.
- **"El meu cap de setmana" setup wizard:** Only 60 users opened the existing
  filter modal in 28 days. Asking 92% one-off search visitors to fill a
  preference form fails before they see a single plan. Default town and weekend
  pages must be good with zero setup.
- **On-site natural-language AI search:** Internal search ran 28 times in 28
  days (`26` `zero_results`). Meanwhile `chatgpt.com` sent 493 sessions (~11%
  of traffic, close to Bing's 573) and Google showed an AI Overview on all 15
  checked queries. People type natural language into Google and ChatGPT, so
  clean crawlable pages beat an on-site LLM query parser.
- **B2G SaaS subscriptions for town halls:** Municipal procurement (*contracte
  menor* and invoicing) is slow. In 12 months `/patrocina` had 178 visitors and
  6 reached `/patrocina/upload` after payment (GA4 property `406884331`, Spain,
  checked 2026-11-11), and checkout still lacks tax-ID (`NIF`) invoices. Keep
  municipal tools free to earn `.cat` backlinks and sell self-serve promotions
  to private venues, festivals, and local businesses.

### 1.3 Logged-in interest tracking and interaction DB (Turns 9 to 10): defer

- Only 117 of 1,899 Spain sessions (~6%) land on `/` or `/es`; ~94% land on
  event or place pages from search. `/` is also cached at Cloudflare
  (`s-maxage=1800`), so server-rendered home personalisation would break CDN
  caching.
- Prod and staging share one 8 GB, 4 vCPU Hetzner box where `Postgres pro` runs
  on 2 GB RAM and 1 CPU (`docs/self-hosted-resource-limits.md`). Streaming
  per-card view durations into Postgres adds write load and GDPR profiling
  scope for no gain.
- Tag GA4 events with `category_slug` (uses slot 49 of 50 standard event-scoped
  custom dimensions; `place_slug` is already registered; tracked in `#807`),
  collect 4 weeks of data, rank the event-page related row first
  (`related_event_click` already gets 50 clicks, 3.9% of `view_event_page`),
  and keep any future user profile in `localStorage`.

## 2. Four verified bottlenecks holding us back (2026-11-15)

### 2.1 Empty shelves in Catalonia's largest cities

Production exposes 947 cities and 43 comarques with 4,063 upcoming events (215
on 2026-11-15), and 1,662 of them (41%) are in Barcelona alone.

| City | Our upcoming events | `vine.cat` upcoming | Notes |
| --- | ---: | ---: | --- |
| Barcelona | 1,662 | 3,755 | 33 of 50 sampled have an image |
| Lleida | 122 | n/a | 8 of 50 sampled (16%) have an image |
| Tarragona | 88 | 508 | 50 of 50 sampled have an image |
| Girona | 74 | 572 | 5,400 searches/month for "agenda girona" |
| Mataró | 19 | n/a | 480 searches/month |
| Cardedeu | 18 | n/a | local baseline |
| Granollers | 15 | 113 | Capital of Vallès Oriental, 480 searches/month |
| Reus | 9 | n/a | 108k population |
| Terrassa | 3 | n/a | 3rd largest city in Catalonia (225k pop) |
| Vic | 3 | n/a | Capital of Osona |
| Sitges | 2 | n/a | High tourist demand |
| Sabadell | 0 | 338 | 5th largest city in Catalonia (220k pop) |
| Manresa | 0 | n/a | Capital of Bages (80k pop) |

Catalan town pages fell from average position 13.0 (Jul 2025) to 46.1 (Oct
2026) and town clicks fell from 255 to 23 a month (`traffic-decline-analysis-2026-11.md`).
That analysis ruled out indexing bugs and overall inventory loss, and could not
separate the December 2025 core update from overlapping site changes, framing
the drop as a gradual quality re-rating of town pages. Whether hundreds of
0-to-3-event village URLs weigh down town-page quality is a hypothesis to test
with Search Console Page Indexing cohorts and `#706` / `#809`.

### 2.2 Missing images, venue coordinates, and prices

Across 150 sampled upcoming events (`87` `RSS`, `44` `SCRAPE`, `19` `MANUAL`):

- **Images:** 106 of 150 (70.7%) have an image; 29.3% have none (84% missing in
  Lleida, 34% in Barcelona).
- **Venue coordinates:** 0 of 250+ sampled `EventSummaryResponseDTO` items
  carried `latitude` or `locationPrecision: "VENUE"`, so `buildEventMapPoints`
  (`utils/event-map.ts`) collapses all listings into town-center rings.
- **Price and age:** 4.5% of upcoming events mark free and 4.6% state an age,
  leaving `offers` absent from live `Event` JSON-LD.

### 2.3 Supply alone fails without SEO packaging (`vine.cat` check)

`vine.cat` has 970 events today across 325 towns, complete with auditorium
venues and prices (`Entrada lliure`, `Des de 4.00 €`), yet showed up on 0 of 15
Google SERPs. Its town pages sit at `/explora/<town>/` with bare town-name
titles (`"Granollers"` instead of `"Agenda Granollers"`), publish in Catalan
only, and skip radius backfill on small villages.

### 2.4 Uncaptured Spanish and English search demand

90-day Search Console slice (`2026-08-15` to `2026-11-12`, top 5,000 pages):

| Locale / page group | Clicks | Impressions | CTR |
| --- | ---: | ---: | ---: |
| `ca` total | 1,893 | 40,080 | 4.72% |
| `es` total | 1,258 | 13,445 | 9.36% |
| `en` total | 172 | 777 | 22.14% |
| `event` (`ca` / `es` / `en`) | 1,705 / 1,186 / 161 | 24,414 / 11,427 / 689 | 6.98% / 10.38% / 23.37% |
| `place_date_or_cat` (`ca` / `es`) | 94 / 49 | 6,196 / 1,534 | 1.52% / 3.19% |
| `place_root` (`ca` / `es`) | 42 / 10 | 6,280 / 384 | 0.67% / 2.60% |

59% of GA4 Spain visitors run Spanish browsers (33% Catalan, 7% English).
`"que hacer hoy en barcelona"` gets 9,900 searches/month against 1,600 for
`"que fer avui a barcelona"`, and Google's Event Rich Experience in Spain only
accepts Spanish pages. Local agendas (`vine.cat`, `surtdecasa.cat`,
`festacatalunya.cat`, Gencat) are Catalan-only, while our `/es/` and `/en/`
pages still render untranslated Catalan event titles and descriptions.

## 3. Six 80/20 bets verified against current code

Every bet below was checked against `que-fer`, `esdeveniments-backend`, and
`cultural-agenda-sync` plus live HTTP responses on 2026-11-15.

### Bet 1: Structured open-data ingestion (`cultural-agenda-sync`)

- **Already in code:** `esdeveniments-backend/importer/` runs internal `RSS`,
  `SCRAPE`, and `JSON_API` sources. `cultural-agenda-sync` runs in GitHub
  Actions (`POST /api/events` multipart with Logto PAT exchange and
  `X-Backend-Key`) for `gencat` (RSS + HTML detail scrape), `barcelona` (106 MB
  Open Data BCN JSON with Cloudflare WARP), and `telegram` (1 channel).
- **Why cities were empty anyway:** `sync-gencat.yml` runs once daily (`0 6 * * *`,
  though its README says hourly) with `MAX_EVENTS_PER_RUN=100` and
  `AI_IMPROVE_DESCRIPTIONS=all`, chewing through a 790-item RSS queue full of
  1980 to 2024 permanent museum records. Meanwhile `src/index.ts:552` drops paid
  price strings (`price: eventType === "FREE" ? "0" : null`), even though
  `CreateEventRequestDTO.price` and `que-fer/utils/event-price.ts` already render
  free-text prices and schema.org `offers`.
- **Verified live feeds to add in `cultural-agenda-sync`:**
  1. **Generalitat Socrata (`rhpv-yr4f.json`, kept under `source.id = "gencat"`):**
     1,257 upcoming rows across **1,093 distinct `codi`** (Manresa 27, Vic 24,
     Terrassa 23, Mataró 22, Granollers 19, Sabadell 16, Girona 62, Lleida 37,
     Tarragona 16) in 1 JSON call. Must group by `codi` (multi-town touring
     cycles carry umbrella dates only), keep `:443` in `originalUrl` for
     `processed-hashes.json` compatibility, use the unique article URL as `url`
     to avoid 409 collisions on venue homepages, parse `comarca_i_municipi` plus
     coordinate city fallback, split comma-separated `imatges`, and order
     non-Barcelona events first.
  2. **Diputació de Barcelona Open Data (`do.diba.cat`):** `actesturisme_ca`
     (293 upcoming), `actesmuseus` (87), and `actesparcs` (145) share one CC-BY
     4.0 JSON schema (`ord-data_fi/desc`). `actesbiblioteques_ca` (~1,500
     upcoming, mostly recurring story-time and reading clubs) stays opt-in until
     the thin-page gate exists. Pagination needs `acte_id` dedup, overlapping
     windows, a full-page `< today` stop check, year-typo guards (`8202-01-19`),
     and bounded `og:image` fetches.
  3. **Ajuntament de Reus Open Data (`opendata.reus.cat` `agenda.csv`):** 92
     upcoming events in semicolon CSV (vs 9 on the site today). Has no body
     description column and rate-limits repeat fetches with HTTP 429, so it
     builds a factual description from `agenda_subtitle`, venue, organizer, and
     price (`skipAiDescription: true`) and filters Reus's generic
     `caratula_900_600.png` image.
- **Dropped after live checks:** Terrassa CKAN CSV (`actual_agenda_activitats_ciutat_terrassa.csv`
  stopped on `2024-12-31`, 0 upcoming rows), DIBA `actesdiba_ca` (political board
  meetings), DIBA `sostenible_agenda` and `patrimonicultural` (0 upcoming rows),
  `entrapolis.com/api/v1/events` (404), `girona.cat/rss` (news/incidents only),
  and `calendari.femudatraca.cat/api/events` (67 items, no descriptions).

### Bet 2: Radius-backed town agendas plus a hysteresis `noindex` gate

- **Already in code:** `que-fer/config/town-seo-test.ts` runs a 30-town A/B/C
  test (`TOWN_TEST_MIN_EVENTS = 8`, readout 2026-12-06 to 2026-12-20) where
  Group A tests `"Agenda {Town}"` titles and Group B adds `TownGuide` plus
  comarca events. `esdeveniments-backend` already has
  `EventSpecification.withinRadius(lat, lon, radius)` on `city.latitude` and
  `city.longitude`. `/festa-major/<place>` already enforces a 5-act `noindex,
  follow` gate.
- **Missing in code:** cross-comarca 15 km radius backfill on `/<town>` ( paired
  with `withinBoundingBox` + caching so 1-CPU Postgres is not hit by uncached
  trigonometric scans), and a hysteresis `noindex, follow` gate when even the
  15 km radius has 0 events (avoiding index/noindex flapping on small villages).
- **Test-contamination rule:** 29 of the 30 `#706` test towns sit in DIBA and
  Socrata coverage. Hold scheduled DIBA backfills or exclude/snapshot the 30
  test towns until the December readout finishes.

### Bet 3: Price pass-through now; `VENUE` coordinates and N-locale `translations` map next

- **Already in code:** `que-fer` supports `locationPrecision === "VENUE"`
  (`utils/event-map.ts`), free-text `price` + JSON-LD `offers`
  (`utils/event-price.ts`), localized `/es/e/*` and `/en/e/*` metadata and
  schema fallbacks, and an N-locale `translations` read map
  (`resolveEventLocalizedText` in `utils/event-helpers.ts`). `Event.java` and
  `CreateEventRequestDTO.java` already store `price` (`VARCHAR(500)`).
- **Missing in backend (`esdeveniments-backend`):** `Event.java` has **no**
  `latitude`, `longitude`, or `locationPrecision` columns yet, and the
  normalized `event_translation` child table (`Esdeveniments/esdeveniments-backend#117`)
  is pending implementation; `EventSummaryResponseDTO.java` also omits `price`
  and coordinates. `BucketStorageServiceImpl` accepts JPEG and PNG only (which
  is fine for Socrata and DIBA).
- **80/20 split:** normalised `price` pass-through in `cultural-agenda-sync`
  and `/es/` + `/en/` metadata localization in `que-fer` are live (0 backend
  changes). Implement `Esdeveniments/esdeveniments-backend#117` next so
  reviewed `es`, `en`, and future `fr`+ event translations flow through a
  single `translations[locale]` map without schema churn.

### Bet 4: Evergreen URLs for recurring fairs and venues (parked after Bets 1 and 2)

- **Already in code:** `/festa-major/<place>`, `config/festivities.ts`, and
  `utils/event-series.ts` (`seriesKey` + `pickNextEdition` for `NextEditionLink`).
- **Missing in code:** `Event.java` has no `Venue` entity or `series_slug`
  column (`AGENTS.md` notes a permanent series URL needs a backend recurring
  flag). Keep parked until Bets 1 and 2 recover town rankings.

### Bet 5: `.ics` feeds and `/embed/<town>` widgets (parked; low current demand)

- **Already in code:** `utils/calendarUtils.tsx` builds single-event
  `data:text/calendar` URIs only (`1` `add_to_calendar` click in 28 days).
- **Missing in code:** no multi-event `.ics` route and no `/embed/<town>` route;
  `next.config.js` / `proxy-csp.ts` frame headers would also need an explicit
  `/embed/:path*` exemption, and municipal embeds require manual outreach. Park
  until core search traffic recovers.

### Bet 6: Stateless WhatsApp `/tria` and AI citation tables (parked; fix `zero_results` first)

- **Already in code:** MCP (`app/mcp/route.ts` + `config/mcp-tools.ts`),
  `Accept: text/markdown`, cookie favorites (`utils/favorites.ts`), and
  single-event `buildWhatsappShareHref` (`utils/share-kit.ts`).
- **Missing / higher-priority fix:** before building `/tria` (`8` shares and `5`
  favorites in 28 days), fix why **26 of 28 internal searches returned zero
  results** (`EventSpecification.filterByTerm` only runs `LOWER(title) LIKE`,
  ignoring accents, descriptions, and venue names).

## 4. Claude Opus 5.5 critique summary (2026-11-15)

1. **Narrow active scope to Bets 1 + 2 + normalised `price` pass-through.** At
   1,740 monthly Spain users on an 8 GB shared box, Bets 4, 5, and 6 add
   surface area ahead of demand.
2. **Protect the `#706` 30-town SEO experiment (readout Dec 6 to 20).** Adding
   Barcelona-province supply flips Group B towns across `TOWN_TEST_MIN_EVENTS = 8`.
   Keep `sync-diba.yml` manual (`workflow_dispatch`) or snapshot/exclude the 30
   test towns until the readout completes.
3. **Prevent cross-source duplicates against backend importers.** Query existing
   backend events for the target `(citySlug, startDate)` and fuzzy-match titles
   before `POST /api/events`, and add GitHub Actions `concurrency` groups so
   overlapping runs never clobber hash caches.
4. **Keep `AI_IMPROVE_DESCRIPTIONS` deliberate.** Verbatim government text across
   thousands of pages risks duplicate-content demotion against official sources,
   while blind AI rewriting on thin inputs (Reus) risks hallucination. Rewrite
   when real source prose exists (`gencat`, `diba`), and use deterministic
   factual assembly when source prose is absent (`reus`).
5. **Respect CC-BY 4.0 attribution and long exhibitions.** Keep source URLs
   attached to ingested events, and watch multi-month exhibitions (>60 days, 372
   rows in Socrata) so they do not crowd town listings.

## 5. Execution order and gates

| Step | Work | Gate to move on |
| --- | --- | --- |
| 1 | `cultural-agenda-sync`: upgrade `gencat` to Socrata `rhpv-yr4f` (with RSS fallback), add `diba` (`turisme`, `museus`, `parcs`) and `reus`, normalise `price`, add cross-source `(city, date, title)` dedup and workflow `concurrency` | Unit tests + live `DRY_RUN=true` pass; `sync-diba.yml` excludes the 30 `#706` test towns until 2026-12-20 |
| 2 | Diagnose town-page ranking drop in GSC Page Indexing + read `#706` test; ship winning town template + cached 15 km radius backfill + hysteresis `noindex` gate; fix accent-insensitive internal search | Catalan and Spanish town-page impressions and clicks rise over 28 days in Search Console |
| 3 | Pilot ingestion-time Spanish translation (`titleEs`, `descriptionEs`) + `VENUE` coordinates (`Event.java` migration + `EventSummaryResponseDTO`) | `/es/` clicks and rich-result impressions grow without raising Hetzner DB CPU |
| 4 | Revisit `/fires/<slug>`, `/espai/<slug>`, `actesbiblioteques_ca`, `.ics`, `/embed`, and `/tria` | Only after monthly Spain traffic passes 5,000 users or organic saves/shares 5x |
