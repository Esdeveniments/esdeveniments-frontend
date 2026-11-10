# Competitor features research (2026-11-10)

Which competitor features are worth copying, ranked by evidence. Every claim
below has a source: a live page, a Google doc, our code, a real Google result
page, Keyword Planner, Search Console or GA4. Anything without one is marked
**unverified**. This builds on `docs/design-rationale.md` › 5,
`festivity-hubs-research-2026-11.md` › 3 and
`paid-acquisition-research-2026-11.md`.

## 0. Sources and limits

| Source | What and when | Limits |
| --- | --- | --- |
| Google results | 15 queries recorded on google.es, `hl=ca`, `gl=es`, `pws=0`, in the owner's Chrome, 2026-11-10 | Location may still personalise. Top 7–9 organic only. 3 more queries hit a captcha (§2.3) |
| Keyword Planner | `GenerateKeywordHistoricalMetrics`, Spain (geo 2724), Google Search, average monthly searches | Bucketed estimates; close variants get merged |
| Search Console | `sc-domain:esdeveniments.cat`, queries, 2026-08-10 → 2026-11-08 (7,040 queries, 34,586 impressions, 225 clicks) | Anonymised queries are left out |
| GA4 | Property 406884331, **country = Spain**, 2026-08-10 → 2026-11-08 | Spain filter needed: about 80% of raw traffic is bots |
| Competitor pages | Fetched and read on 2026-11-10 | We have **no traffic data for any competitor** |
| Our data | 1,000 upcoming events from `/api/events` (production), 2026-11-10 | One sample |

## 1. Who actually ranks

### 1.1 Domains across the 15 recorded result pages

| Domain | Pages it appears on (of 15) |
| --- | --- |
| femturisme.cat | 12 |
| surtdecasa.cat | 8 |
| timeout.cat | 5 |
| festacatalunya.cat | 5 |
| barcelona.cat | 5 |
| instagram.com | 5 |
| classificats.net | 4 |
| agenda.cultura.gencat.cat | 3 |
| **esdeveniments.cat** | **0** |

An AI Overview showed on all 15. catalunyainfo.cat, which the first draft of
this doc said "ranks above us", appeared on none of them.

### 1.2 Demand and our position for the queries checked

Volume is from Keyword Planner and our position from Search Console (90 days).
"Top results" comes from the Google result pages; "—" means not checked.

| Query | Searches/month | Our avg. position | Top results |
| --- | ---: | ---: | --- |
| que hacer hoy en barcelona | 9,900 | 75 | — |
| que hacer este fin de semana barcelona | 5,400 | 59 | Time Out es, barcelona.cat, barcelonasecreta, Instagram, Fever, vamoseventos, femturisme |
| agenda girona | 5,400 | 49 | — (captcha) |
| que fer aquest cap de setmana | 4,400 | 38 | Time Out, surtdecasa, betevé, festacatalunya, barcelona.cat, femturisme |
| festa major | 3,600 | no impressions | — |
| que fer avui a barcelona | 1,600 | 35 | — |
| fires catalunya | 1,600 | 43 | — (captcha) |
| que fer avui | 1,300 | 51 | surtdecasa `/agenda/avui`, festacatalunya, quefemavui.cat, Time Out |
| agenda osona | 880 | 33 | — ("agenda cap de setmana osona": agendaosona.cat, laplanaweb, femturisme, el9nou) |
| agenda cultural barcelona | 880 | 54 | — |
| festes majors catalunya | 590 | no impressions | — (captcha) |
| agenda granollers | 480 | 23 | granollers.cat, classificats, visitgranollers, femturisme (4), surtdecasa (7) |
| agenda mataro | 480 | 24 | — |
| agenda catalunya | 390 | 34 | femturisme `/agenda`, surtdecasa, Gencat, festacatalunya |
| agenda maresme | 390 | 20 | — ("que fer al maresme": turismemaresme, femturisme ×2, sortirambnens) |
| que fer amb nens aquest cap de setmana | 390 | no impressions | escapadaambnens, sortirambnens, surtdecasa `/agenda/familia`, betevé, totnens, Time Out |
| agenda cap de setmana | 320 | 23 | surtdecasa, festacatalunya, Time Out, barcelona.cat, femturisme, Gencat |
| agenda valles oriental | 170 | — | femturisme (1), el9nou, classificats |
| agenda la garriga | 140 | — | lagarriga.cat, visitalagarriga, classificats, femturisme (4, 8) |
| agenda el masnou | 40 | — | elmasnou.cat, femturisme (2), elmasnou.info, surtdecasa (8) |
| activitats gratuites barcelona / que hacer gratis en barcelona | 110 / 140 | — | ("plans gratis barcelona": Time Out ×2, barcelona.cat, irbarcelona…) |
| plans gratis barcelona | 20 | — | as above |
| que fer quan plou / que fer si plou / plans per dies de pluja | 10 / 0 / 0 | — | not checked |
| que fer pont / pont de la puritat | 0 / 0 | — | not checked |

Our strongest topic is still festa major for a specific town and year: 349
queries, 2,439 impressions, average position 17.5 in Search Console.

### 1.3 Topic buckets in our Search Console (90 days)

| Bucket (regex on query) | Queries | Impressions | Clicks | Avg. position |
| --- | ---: | ---: | ---: | ---: |
| avui / hoy / today | 635 | 3,037 | 23 | 46 |
| agenda | 286 | 3,160 | 32 | 26 |
| cap de setmana / fin de semana | 305 | 2,822 | 21 | 41 |
| festa major | 349 | 2,439 | 20 | 18 |
| nens / família / infantil | 125 | 841 | 2 | 55 |
| gratis / gratuït | 14 | 30 | 0 | 45 |
| pont / festiu | 6 | 70 | 0 | 31 (all "Pont de Vilomara") |
| pluja / plou | 3 | 8 | 0 | 7 |

## 2. What the winners do (verified on their pages)

### 2.1 femturisme.cat (on 12 of 15 result pages)

- `/agenda?ubicacio=el-masnou`: title "Agenda El Masnou: fires, festes,
  mercats, concerts ... | femturisme.cat", H1 "Agenda El Masnou",
  "Distància: 20km", "24 resultats", about 1,881 words. Only BreadcrumbList
  JSON-LD, no Event markup. Also has Experiències and Destaquem blocks, a
  WhatsApp channel CTA and a "Gratuït" label.
- `robots.txt` allows only `/*agenda?ubicacio=` and disallows other
  `?ubicacio=` URLs, so its town agenda is a deliberately indexed filter URL.
- It also ranks with comarca agendas (`?ubicacio=maresme`, Vallès Oriental #1,
  Osona) and `/pobles/<town>` guide pages (about 1,562 words,
  TouristDestination schema).
- **Unverified**: why it ranks. Domain age, links and tourism content are
  possible causes; we can't measure them from outside.

### 2.2 surtdecasa.cat (on 8 of 15)

Ranks with dedicated `/agenda/avui`, `/agenda/cap-de-setmana` (about 782
words) and `/agenda/familia` pages and with `/barcelona/municipi/<town>/<id>`
pages. That is the same set of page types we already have
(`/catalunya/avui`, `/catalunya/cap-de-setmana`,
`/catalunya/cap-de-setmana/familia-i-infants`, `/<town>`).

### 2.3 Editorial guides (Time Out, betevé, barcelona.cat, catalunyainfo)

- **Time Out** `/barcelona/ca/que-fer/el-cap-de-setmana-ideal`: dated title
  and H1 ("del 13 al 15 de novembre"), about 4,651 words, sections for
  divendres, dissabte and diumenge, "gratis" mentions and a newsletter.
- **betevé** weekend page: NewsArticle, "Cinc plans imprescindibles", a
  newsletter CTA under the intro, updated "Cada divendres". Its today page
  title is "Què Fer Avui 10 novembre a Barcelona?…".
- **catalunyainfo** weekend page: title "Què fer aquest cap de setmana a
  Catalunya (13–15 nov)", about 2,585 words, a stats line ("182 activitats en
  93 municipis, 39 d'elles gratuïtes") and a table of contents with "Si
  plou", "Sense cotxe" and "Ponts i festius". Its byline is dated 14 Sep 2026,
  so the site is new. Not in any result we recorded.
- Ours, for comparison: `/catalunya/cap-de-setmana` about 785 words,
  `/barcelona/avui` 518, `/es/barcelona/cap-de-setmana` 623, all with dated
  titles since #710 (2026-11-08).
- **Unverified**: that length or editorial picks cause the ranking. This is a
  correlation across a handful of pages.

### 2.4 Others checked

| Site | Feature seen | Evidence |
| --- | --- | --- |
| MiniMapa `/es/planes-gratis-con-ninos-barcelona` | Age bands 0-3, 3-5, 6-8, 9-12; type, when and Mañana/Tarde filters; "Gratis"; "428 planes encontrados" | Page |
| culturaviva | Weekly Telegram channel per province, `/events/?free=1` (428 events), `/venues/` | Page |
| Gencat agenda | Newsletter, "Posa l'Agenda al teu web" widget, RSS | Page |
| festesmajorsdecatalunya | Dated weekend title, Event JSON-LD, newsletter "Cada dijous", "Ja som més de 50 mil" | Page; the 50k figure is **self-reported** |
| planomato (Granollers) | About 3,149 words, Hoy / Esta semana / Fin de semana / Este mes / Próximo mes tabs | Page. It sends us 18 sessions in 90 days (GA4) |
| festacatalunya `/comarca/maresme` | About 795 words, newsletter | Page |
| criar.cat `/plans/` | Weekly dated family article | Page |

## 3. Facts about us that change the ranking

| Fact | Evidence |
| --- | --- |
| 91% of users are new | GA4 Spain: 4,382 new vs 416 returning |
| Push opt-in doesn't convert | GA4 Spain: 435 `push_optin_offer_view`, 344 `push_optin_dismiss`, 1 `push_optin_click`, 1 `push_optin_failed`, 0 `push_optin_success` |
| Social and Telegram bring almost nothing | GA4 Spain sessions: Organic Search 3,951, Direct 567, AI Assistant 561, Organic Social 34; no `t.me` source. `t.me/esdeveniments` (`config/index.ts:169`) has 7 members |
| ChatGPT sends about as much as direct traffic | 559 sessions from `chatgpt.com`, about 10% of 5,328 (Google 2,772, Bing 648, direct 567) |
| Free and age data are thin | Of 1,000 upcoming events, 45 (4.5%) say free and 46 (4.6%) state an age; 63 are family events, 21 of them with an age. Event summaries have no price or type field |
| Event `offers` markup is coded but never emitted | `utils/schema-helpers.ts:161-162, 326-336` and `utils/event-price.ts:45` build offers from `price`, but the production API sends no `price` key (0 of 150 events checked) |
| `eventStatus` is fixed to Scheduled | `utils/schema-helpers.ts:299`. Google treats a missing status as Scheduled and our API has no cancelled state, so there is nothing to fix |
| Google's event experience in Spain is **Spanish only** | Google event structured data docs. Our `ca` pages aren't eligible; our `es` pages are |
| Google says not to write pages for every query variation | Google's AI-features guide: making content for each query or fan-out variation to manipulate ranking breaks the scaled content abuse policy. The same guide says Google ignores `llms.txt` |
| FAQ rich results are gone | Google: not shown since 2026-05-07, docs removed 2026-06-15 |
| Town-page test is running | `config/town-seo-test.ts` (A: femturisme-style title, B: content plus comarca events below `TOWN_TEST_MIN_EVENTS` = 8, C: control). Live since #712 on 2026-11-08. Girona, Sabadell and Terrassa are not in it |

## 4. Features to copy, ranked by evidence

Tracked in #706 (items 1 and 3, after the town-test readout) and #748 (item 2, can start now).

| # | Feature (who does it) | Why, with evidence | Confidence |
| --- | --- | --- | --- |
| 1 | **femturisme's town agenda model**: "Agenda {town}" title plus nearby events within a radius | femturisme is on 12 of 15 result pages and ranks for every "agenda {town}" query we checked (Masnou 2, Garriga 4, Granollers 4, Arenys 3, Vallès Oriental 1). Our town agendas sit at 20–49. Already being tested (groups A and B). **Action:** read the test between 2026-12-06 and 2026-12-20; if it wins, roll it out first to the largest towns outside the test: Girona (5,400 searches/month; `/girona` got 9–111 impressions a month, and for "agenda girona" Google shows `/en/girona` at 50, not `/girona`), Sabadell (390), Terrassa (320) | Medium: the test will tell |
| 2 | **Count line on today pages** ("103 activitats avui", from catalunyainfo's "182 activitats en 93 municipis") | Largest demand we checked: "que hacer hoy en barcelona" 9,900 (we're at 75), "que fer aquest cap de setmana" 4,400 (38), "que fer avui" 1,300 (51). The count is the page's own `totalElements` with `from`/`to` (103 today, 569 this weekend on 2026-11-10; `byDate` is ignored by the backend). Time Out's divendres / dissabte / diumenge sections are **out**: the backend returns weekend events in mixed date order (esdeveniments-backend#63), so sections would break on "load more". Run it as a date-type A/B test, `avui` vs `cap-de-setmana`, because 11 places hold 95% of date-page impressions and Barcelona alone 38%, so a split by place can't be balanced. Whether a count causes ranking is unverified | Low–medium: the test will tell (#748) |
| 3 | **A family page that can rank** (surtdecasa `/agenda/familia` at 3, betevé, Time Out `/nens`) | 390 + 170 searches/month. `/catalunya/cap-de-setmana/familia-i-infants` is `noindex, follow` and canonicalises to `/catalunya/familia-i-infants` by design (`utils/proxy-page-headers.ts:120-124`, `components/partials/generatePagesData.ts:233-238`: Search Console flagged 3-segment URLs as thin or duplicate). The indexed page `/catalunya/familia-i-infants` (URL Inspection: indexed, crawled 2026-10-17) gets 4 impressions at 40.8 for "que fer aquest cap de setmana amb nens". **Action:** after the town test, apply its title lesson to this page ("Què fer amb nens a Catalunya…"). Don't lift the 3-segment noindex for one category without new evidence | Low: one page, title-only lever |
| 4 | ~~Event rich results on `es` pages~~ **dropped** | URL Inspection (2026-11-10) on two `/es/e/` pages and `/catalunya/familia-i-infants`: Event items detected, verdict PASS, only `performer` and `offers` warnings. Search Console records no search appearance of any type in 90 days. The markup is valid; whether Google shows the event experience is its choice. No code change is backed by evidence | — |
| 5 | **Answer AI assistants well** | ChatGPT sends 559 sessions (about 10%, close to Bing's 648), and an AI Overview showed on every Google result page we recorded. No competitor feature to copy here; keep pages factual and crawlable. Don't make per-variation pages (Google's scaled content policy) | Data is solid; best action unclear |
| 6 | **Weekly newsletter** (betevé, Time Out, Gencat, festesmajors, festacatalunya) | Every editorial competitor has one, but nothing shows our users want one: push gets 0 sign-ups of 435 offers, Telegram has 7 members, social sends 0.6% of sessions. Only worth a cheap test (an email field on weekend pages, counting sign-ups) before building anything | Low |

## 5. Don't copy (evidence says no)

| Feature | Who | Why not |
| --- | --- | --- |
| "Si plou" sections | catalunyainfo | 0–10 searches/month; 8 impressions in 90 days |
| "Ponts i festius" sections | catalunyainfo | 0 searches/month for "que fer pont" and "pont de la puritat" |
| Free filter or label | femturisme, culturaviva, MiniMapa | 4.5% of our events say free and the API has no price field; demand is 20–140/month and our gratis bucket has 30 impressions. Revisit if the backend adds price |
| Age-band filters | MiniMapa | 4.6% of our events state an age |
| Telegram or WhatsApp channel per comarca | culturaviva, femturisme | Our channel has 7 members and sends no tracked traffic |
| FAQ markup for rich results | — | Google retired FAQ rich results (2026-05-07) |
| `llms.txt` for Google | — | Google ignores it |
| Pages for every query variation | — | Google's scaled content abuse policy |
| Attendee counts, price amounts on cards | Eventbrite, Fever | Already rejected in `docs/design-rationale.md` › 5.2 |

## 6. Corrections to the first draft of this doc

- "Restore `offers` with price 0": offers already exist in code; the API just
  sends no price.
- "Use `scripts/holidays.json`": only `scripts/ga-dashboard.py` reads it, not
  the app (the app has `easterSundayYmd` in `utils/date-helpers.ts`).
- "Fix `eventStatus`": nothing to fix (§3).
- "catalunyainfo ranks above us": not on any of the 15 result pages.
- "Find out why the family weekend page doesn't rank": it is noindexed on
  purpose (3-segment URL); the indexed page is `/catalunya/familia-i-infants`.
- "Check Event rich results": URL Inspection shows valid Event items (PASS).
- "Free and age filters are high value": our data covers about 4.5% of events.
- "A Telegram channel per comarca is a cheap win": our channel has 7 members.

## 7. Still unverified

- Competitor traffic, and why femturisme ranks (no data).
- festesmajorsdecatalunya's "50 mil" subscribers (self-reported).
- Results for "agenda girona", "fires catalunya" and "festes majors
  catalunya" (Google captcha).
- Whether the Google results we recorded are personalised by location.
- Whether page length or editorial picks cause the ranking (§2.3).
