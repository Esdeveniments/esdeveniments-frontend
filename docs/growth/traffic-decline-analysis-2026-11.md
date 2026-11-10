# Why search traffic is falling (2026-11-10)

What fell, when, and which causes the data rules in or out. Every number has a
source. Anything without one is marked **unverified**. This builds on
`paid-acquisition-research-2026-11.md` (§ Search Console, § Town-page test)
and `competitor-features-research-2026-11.md` (§1, who ranks now).

## 0. Sources and limits

| Source | What | Limits |
| --- | --- | --- |
| Search Console API | `sc-domain:esdeveniments.cat`, all locales, Jul 2025 → Oct 2026, by month, week, page and query | Anonymised queries left out; position is an impression-weighted average |
| URL Inspection API | Home, 9 lost town pages, 80 random upcoming events, 2026-11-10 | Shows the last crawl only, not history |
| GA4 Data API | Property 406884331, country = Spain, medium = organic | Inflated by Zaraz until 2026-08-17 (§4) |
| Google Search Status | `status.search.google.com/incidents.json` (ranking updates) | Dates only, no detail |
| Google docs | Core updates guide, robots.txt spec, helpful-content self-assessment | — |
| Git history | Commits named in §3 | — |
| Backend | `/api/events` `totalElements` per month | Production API, 2026-11-10 |

## 1. What fell

### 1.1 Clicks per month (Search Console)

| Month | Clicks | Month | Clicks |
| --- | --- | --- | --- |
| Jul 2025 | 3,505 | Feb 2026 | 1,009 |
| Aug 2025 | 1,610 | Mar 2026 | 1,318 |
| Sep 2025 | 1,767 | Apr 2026 | 1,306 |
| Oct 2025 | 1,972 | May 2026 | 1,453 |
| Nov 2025 | 1,309 | Jun 2026 | 1,464 |
| Dec 2025 | 1,045 | Jul 2026 | 1,222 |
| Jan 2026 | 1,193 | Aug 2026 | 858 |
|  |  | Sep 2026 | 1,200 |
|  |  | Oct 2026 | 1,296 |

- Year over year: September −32%, October −34%.
- Since November 2025 clicks are flat at about 1,000–1,450 a month. The fall
  happened between October and December 2025; 2026 is a plateau, not a slide.
- July 2025 (3,505) was a summer peak: 22,672 event pages had impressions
  that month vs 10,853 in July 2026.

### 1.2 By page group, October 2025 → October 2026 (clicks)

| Group | Oct 2025 | Oct 2026 | Change |
| --- | --- | --- | --- |
| Events (`/e/…`) | 1,626 | 1,221 | −25% |
| Town and region pages (`/<place>`) | 255 | 23 | −91% |
| Home | 73 | 12 | −84% |
| Date pages (`/<place>/<date>`) | 38 | 35 | flat |

Event pages are steady through 2026 (150–375 clicks a week, average position
10–16). Most of the loss that is still growing is on town pages and home.

### 1.3 Town pages: average position by month (Catalan URLs)

| 2025 | Jul | Aug | Sep | Oct | Nov | Dec |
| --- | --- | --- | --- | --- | --- | --- |
| Position | 13.0 | 17.3 | 14.8 | 13.2 | 15.2 | 20.0 |

| 2026 | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Position | 20.8 | 21.8 | 27.7 | 24.7 | 31.8 | 34.7 | 42.0 | 43.5 | 45.9 | 46.1 |

The `/es/` town pages did not take these clicks; this is not a language shift.

Home: position about 12–17 until November 2025, about 20–24 from 2025-11-29,
about 30–37 from 2025-12-05 on.

### 1.4 Fixed queries (monthly position, Jul 2025 → Oct 2026)

All held position 3–8 until November 2025 and slipped from December 2025.

| Query | Before | Now |
| --- | --- | --- |
| agenda arenys de munt | 3–4 | 11–12 |
| agenda baix llobregat | 6–8 | 18–32 |
| agenda vilassar de mar | 5–7 | 12–31 |
| agenda maresme | 8–9 | 15–27 |
| agenda malgrat de mar | 6–8 | 13–19 |
| esdeveniments | 3 | 10 (Dec 2025), then 15–31 |
| agenda argentona, agenda canet de mar | 5 | 8–9 |

## 2. Google updates, week before vs week after

Google's core-updates guide says to compare a week before a rollout with a
week after it ends.

| Update | Dates | Town pages | Home | Events |
| --- | --- | --- | --- | --- |
| Dec 2025 core | 2025-12-11 → 12-29 | 18.3 → 24.9 | 25.6 → 35.4 | 21.7 → 19.2 |
| Mar 2026 core | 2026-03-27 → 04-08 | no clear step | no clear step | no clear step |
| May 2026 core | 2026-05-21 → 06-02 | no clear step | no clear step | no clear step |

Other updates in the window (no core): Feb 2026 Discover, spam updates in
Mar, Jun, Aug and Sep 2026.

`paid-acquisition-research-2026-11.md` says town pages lost about 4 positions
at each of the March and May 2026 core updates. The monthly averages above do
rise in those months (21.8 → 27.7, 24.7 → 31.8), but the week-before/after
check shows the clearest step at December 2025, and the slide continues
between updates. Both readings fit "a gradual quality re-rating of town pages",
which is what the #706 town test checks.

## 3. December 2025: four changes overlap

| Date | Change | Effect seen |
| --- | --- | --- |
| 2025-11-29 | `1af59f3a` "chore: improve seo" (listing FAQ, home link text) | Home slips the same day |
| 2025-12-04 | Move to SST/OpenNext on AWS (`57efef63`, #185) | Home ≈ 35 from Dec 5 |
| 2025-12-11 → 12-29 | December 2025 core update | Town and home step down (§2) |
| 2025-12-21 | next-intl launch (#198): new `/es` and `/en` URLs | Spanish pages now bring 400–500 clicks/month, offsetting part of the loss |

The data can't separate these four. Event pages were not hurt in the same
weeks, so whatever happened hit home and town pages specifically.

## 4. Ruled out (with evidence)

- **Indexing.** URL Inspection: home and every lost town page checked
  (arenys-de-munt, el-masnou, baix-llobregat, vilassar-de-mar, la-garriga,
  maresme, barcelona, argentona, `/es/arenys-de-munt`) is "Submitted and
  indexed", Google's canonical equals ours, recently crawled.
- **Live HTML.** `index, follow`, self canonical, hreflang, h1 and event links
  present.
- **robots.txt 403 on 2025-12-22/23.** Google's robots.txt spec treats a 4xx
  (except 429) as "no restrictions", so it blocked nothing.
- **Titles.** The October 2025 town title was "Guia d'activitats a X - mes
  any" (no "agenda"); "Què fer a X - Agenda i plans 2026" came on 2026-01-01
  (`b87f2dc0`), after the drop.
- **Fewer events.** Backend `totalElements`: July 2,696 → 4,072, October
  3,823 → 5,622 (2025 → 2026). Inventory grew.
- **Staging duplicate.** `staging.esdeveniments.cat` was indexed in April 2026
  (785 pages, 87 clicks). It now sends `X-Robots-Tag: noindex, nofollow` and
  `Disallow: /`; its impressions are near zero. Fixed.
- **GA4 "−45.7%" (audit #697).** Measurement, not traffic. The ratio of GA4
  Spain organic Google sessions to Search Console clicks was about 2.0 until
  October 2025, 1.7 in mid-2026, 1.4 in August 2026 and 0.75 in Sep–Oct 2026.
  Zaraz double-counted GA4 until 2026-08-17
  (`docs/incidents/2026-08-18-zaraz-zone-wide-google-tags.md`). Use Search
  Console clicks (−3.9% in the same 90 days) for trends.

## 5. Outside factors

- **AI Mode in Spain: 2025-10-08.** It lines up with the October → November
  2025 fall in clicks. Its effect can't be measured from our data, and it
  doesn't explain our positions falling.
- **AI Overviews in Spain: 2025-03-26**, before this window.
- **2026-10-15:** Google added inline links and an "official websites" block
  to AI Overviews and AI Mode (blog.google). It could favour town council
  agendas; **unverified** for our queries.
- **Who ranks now:** femturisme.cat and surtdecasa.cat lead the 15 result
  pages recorded on 2026-11-10 (`competitor-features-research-2026-11.md` §1).
  There is no position history for them, so we can't say when they passed us.

## 6. Open lead: some upcoming events served `noindex` to Google

URL Inspection on 80 random upcoming events (September–November 2026):

| Result | Count |
| --- | --- |
| Submitted and indexed | 64 |
| Excluded by 'noindex' tag (`BLOCKED_BY_META_TAG`) | 11 (14%) |
| URL is unknown to Google | 5 |

- Every noindexed one was crawled **on or before** its event date (e.g. a 30
  September event crawled 2026-07-29), and Google's canonical equals ours.
- Neither noindex rule in `lib/meta.ts` (ended more than 60 days ago,
  malformed slug) applies to them.
- Not reproducible now: those pages serve `index` in ca, es and en.
- **Hypothesis, unproven:** `EventPageContent`
  (`app/[locale]/e/[eventId]/page.tsx`) calls `notFound()` mid-stream (the
  reader returned `null`, or the title is "CANCELLED") after metadata has
  already rendered, and Next adds `<meta name="robots" content="noindex">` to
  the streamed 404 (Google fetched these pages as HTTP 200). A short backend
  404 or a stale cache entry would then be crawled as noindex. Tracked in
  #750.
- Search Console "Excluded by noindex" export (2026-11-10): 22,960 pages on
  2026-08-14 → 43,739 on 2026-11-06. Of the 1,000 most recently crawled
  (Nov 6–8): 776 login URLs (`/iniciar-sessio?redirect=…`, #751), 154 events
  that ended more than 60 days earlier, 70 filtered listings (all expected)
  and **0 upcoming events**. The bug shows no sign in the latest crawls.
- Side finding: an edited event kept its old slug ("club de lectura … betty
  smith 25 de novembre") under a new title and date.

## 6b. Crawl health (Search Console Crawl stats, 2026-08-12 → 11-08)

- 380,438 requests to www. **5.18% got a 5xx** (about 19,700); 404 0.90%;
  temporary redirects 0.84% (this includes the login 307s, #751).
- Crawling fell when responses slowed: 6,900–13,100 requests a day at
  490–565 ms (Aug 12–17), then 1,400–6,600 a day at 770–1,310 ms from
  Aug 18, with peaks up to 3,600 ms in mid-September. It recovered to
  6,950–11,300 a day at 610–670 ms from Nov 5.
- Google's crawl-budget guide: slower responses and 5xx lower the crawl
  limit.
- **The 5xx drill-down** (19,770 errors): 100–270 a day until Sep 10, peaks
  of 630–1,080 on Sep 11–16 and 410–750 on Sep 29–Oct 2, then 220–420 a day
  through October. They fell to 184 (Nov 1), 93 (Nov 2), 58 (Nov 3) and
  **0–2 a day from Nov 4**. That matches the big develop → main release of
  Nov 2–4 (Next 16.4.4, Node 26, the single server read path, real 404/301
  for places, the proxy split). Which change fixed it isn't known.
- Of the 358 example URLs: 202 event pages, 114
  `/static/images/og-home.jpg`, the rest listings, `/sitemap/...` pages and
  2 image-proxy calls. The sampled events and listings all answer 200 now
  (2026-11-10). `og-home.jpg` never existed in the repo; only the home
  `WebApplication` JSON-LD `screenshot` pointed to it. It now answers 404,
  and the field is removed (#752).
- What slowed responses from Aug 18 is still not known (#752).
- This affects how fast Google finds and refreshes pages, not rankings
  directly. It started eight months after the December 2025 drop, so it
  doesn't explain that drop.

## 7. Conclusions

1. **The drop is a ranking loss on town pages and home, not lost indexing,
   fewer events or a penalty.** It started between late November and late
   December 2025 and town pages kept sliding all of 2026 (position 13 → 46).
2. **Event pages are the stable base**: −25% October over October, flat
   through 2026, and 94% of clicks in October 2026 (1,221 of 1,296).
3. **The December 2025 cause can't be pinned down**: the core update, the AWS
   move, the home/listing SEO commit and the i18n launch all fall in four
   weeks.
4. **GA4's −45% is the Zaraz fix**, not lost visitors.
5. Google's advice for a core-update drop: assess content quality (the
   helpful-content self-assessment), avoid quick fixes, and expect recovery to
   take months or the next core update. The #706 town test (live since
   2026-11-08, read around 2026-12-20) is that assessment for town pages.

## 8. Next steps

- Read #706 around 2026-12-20, then again after the next core update.
- Watch Crawl stats for a month to confirm the 5xx stay near 0 and the
  crawl rate holds after the Nov 2–4 release (#752).
- Investigate the event noindex (§6, #750) with Sentry/logs on the
  `notFound()` path and the Search Console Page indexing report ("Excluded by
  'noindex' tag" trend).
- Record the top 10 for 5 fixed town queries once a month, so the next drop
  shows who passed us and when.
- **Unverified, needs data:** CrUX for December 2025 (did the AWS move slow
  the pages?), and the size of the AI Mode effect.
