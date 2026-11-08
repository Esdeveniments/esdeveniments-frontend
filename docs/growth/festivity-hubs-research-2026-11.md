# Festivity hubs: research and plan (2026-11)

Should esdeveniments.cat have evergreen pages for festes majors and other
festivities (Carnaval, Nadal, Reis…)? This doc keeps the data behind the
festa major hubs (built on `feat/festes-majors`), how they fit the existing
URLs, and the plan to extend them to other festivities.

**Verdict.** Yes for festa major (built) and Carnaval (next). Nadal works
as pages per event type ("Fires de Nadal", "Pessebres vivents"), not per
town. Skip Sant Jordi, Sant Joan and Castanyada.

## 1. Demand

### Search Console (our impressions only)

Search Console only shows searches where we already appear, so it understates
demand we don't rank for. Window: 2025-07-01 to 2026-11-06.

| Festivity                     | Queries | Impressions | Clicks | Avg. position | % with a year |
| ----------------------------- | ------- | ----------- | ------ | ------------- | ------------- |
| Festa major                   | 1,290   | 27,619      | 284    | 13.6          | 84%           |
| Fires / mercats (named fairs) | 646     | 7,785       | 62     | 22.4          | 33%           |
| Carnaval / carnestoltes       | 175     | 2,667       | 46     | 9.2           | 97%           |
| Nadal                         | 207     | 1,627       | 11     | 20.7          | 20%           |
| Reis / cavalcada              | 111     | 717         | 3      | 14.8          | 70%           |
| Castanyada / Halloween        | 95      | 615         | 8      | 13.2          | 58%           |
| Pessebre                      | 45      | 603         | 1      | 23.4          | 59%           |
| Sant Jordi                    | 188     | 507         | 0      | 59.4          | 21%           |
| Sant Joan / revetlla          | 98      | 462         | 4      | 43.1          | 30%           |

- Festa major searches are "festa major {town} {year}". Carnaval has the
  same shape ("carnaval malgrat de mar 2026", "carnaval roda de ter 2026"),
  and we already rank #1–5 for some of them with single event pages.
- Nadal searches name one event: "parc de nadal la roca del valles",
  "fira nadal granollers 2025", "nadalem masnou".
- Fairs are named, recurring events ("fira medieval tordera", "mercat segona
  mà granollers"). A permanent URL per recurring event serves them better
  than a festivity page (see section 7).

Before the hubs, in 15 months to 2026-11-06:

- **Festa major searches:** 1,108 queries, 20.5K impressions, 150 clicks.
- **By season:**
  - Summer 2025 (June–September): 22K impressions, 267 clicks, position 10.5.
  - Summer 2026: 4,186 impressions, 42 clicks, position 16.1.
- **Event pages with "festa-major" in the slug:**
  - 2025: 60.8K impressions, 1,251 clicks.
  - 2026: 24.3K impressions, 589 clicks. That was 12% of the site's clicks that summer.
- **Searches landing on the wrong page:**
  - "festa major sant quirze del valles 2025" landed on one June event (2,688 impressions, 1 click).
  - "festa major malgrat de mar" landed on a 2024 event.
  - The top festa major event URL now returns 200 with "No event found" and noindex: a soft 404.

### Keyword Planner (whole market, Spain)

Google Ads Keyword Planner, historical metrics, geo Spain, Google Search.
Ranges are rounded by Google and close spellings are grouped: read them as
orders of magnitude. Generic terms carry other intents ("nadal" includes Rafa
Nadal, "sant jordi" is roses and books, "carnaval" includes Cádiz and
Tenerife), so the town and event-type long tail is what matters.

Per town, summed over 60 Catalan towns (avg/month, and the sum of each
keyword's peak month):

| Search                 | Avg/month | Peak months | Towns ≥50/month | Biggest towns (avg/month)                                                           |
| ---------------------- | --------- | ----------- | --------------- | ----------------------------------------------------------------------------------- |
| festa major {town}     | 21,220    | 148,580     | 58              | Terrassa 1,900, Sabadell 1,600, Granollers 1,600, Barcelona, Lleida, Igualada 1,000 |
| carnaval {town}        | 8,940     | 79,180      | 30              | Barcelona 1,600, Sitges 1,600, Solsona 880, Tarragona 720, Reus 720                 |
| sant joan {town}       | 3,040     | 21,240      | 10              | Barcelona 1,300                                                                     |
| cavalcada reis {town}  | 1,430     | 13,710      | 6               | Barcelona 210, Girona 170                                                           |
| fira de nadal {town}   | 1,240     | 9,760       | 3               | Barcelona 140                                                                       |
| pessebre vivent {town} | 410       | 3,240       | 2               | —                                                                                   |

Single festes and event types (peak month):

- **Festes majors:**
  - Festa Major de Gràcia: 22,200
  - Festa major Granollers: 14,800
  - Festa major Vilafranca: 8,100
  - Festa major Sants: 3,600
  - Festa major Cardedeu: 2,900
- **Carnavals:**
  - Carnaval Sitges 2026: 33,100
  - Carnaval Barcelona: 14,800
  - Carnestoltes: 27,100
- **Nadal and Reis, by event type:**
  - Cavalcada de reis: 18,100
  - Pessebre vivent: 9,900
  - Fira de nadal: 8,100
  - Fira de Santa Llúcia: 6,600
  - Mercat de nadal: 5,400
  - Parc de nadal: 2,400
- **Generic, no local intent:**
  - Revetlla de Sant Joan: 22,200
  - Castanyada: 33,100 (October)

## 2. Our data

Acts per festivity from the public events API. The backend matches `term` as
a substring of the title, so these are upper bounds.

| Festivity   | Season                    | Acts  | Towns | Towns ≥5 acts | Top towns                                      |
| ----------- | ------------------------- | ----- | ----- | ------------- | ---------------------------------------------- |
| Festa major | 2025                      | 1,096 | 104   | 51            | Llinars 83, Malgrat 64, Dosrius 55, Begues 51  |
| Nadal       | 15 Nov 2025 – 10 Jan 2026 | 997   | 101   | 55            | Tarragona 70, Roda de Ter 54, Arenys de Mar 53 |
| Sant Jordi  | 2026                      | 334   | 72    | 16            | Caldes de Montbui 82, Barcelona 48             |
| Carnaval    | 2026                      | 170   | 47    | 13            | Sant Esteve Sesrovires 14, Montgat 12          |
| Sant Joan   | 2026                      | 164   | 56    | 6             | Barcelona 27                                   |
| Reis        | 15 Dec 2025 – 10 Jan 2026 | 151   | 70    | 4             | Mataró 6                                       |
| Castanyada  | 2025                      | 100   | 35    | 2             | Granollers 7                                   |

- **Festa major in 2026:** 1,275 acts in 112 towns, mostly from July to September. Sources: RSS 991, manual 170, scrape 114.
- **Carnaval mismatch:** our acts are in small towns, but demand is in the big carnivals (Sitges, Solsona, Tarragona, Reus, Vilanova). Carnaval pages are worth building only after those carnivals are added as sources.
- **Preprod has no festa major events.** For a local check, run `yarn start` with `API_URL=https://www.esdeveniments.cat/api`, which serves the same GET shapes.

## 3. Competitors (Google, 2026-11)

Searches for "festa major {town}" rank, in order: the town council,
programesfestamajor.cat, festacatalunya, femturisme, surtdecasa, culturaviva,
festamajor.biz, festesmajors.cat. An AI Overview showed on 3 of 4 test
queries, and we were not in the top 8.

- **programesfestamajor.cat** was registered on 2026-08-10. It has 64
  `/town/2026` pages and 7,382 activity pages, and already ranks #3. Proof
  that per-town programme pages rank quickly.
- **festacatalunya** has 978 municipality URLs and 8,442 thin "experience"
  pages, which are at risk in a Google quality update.

## 4. How the hubs fit the existing URLs

| Pattern                                                         | Indexed                                   | Serves "festa major / carnaval {town} {year}" |
| --------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------- |
| `/[place]`                                                      | yes                                       | no, all events                                |
| `/[place]/[date]` (`avui`, `dema`, `setmana`, `cap-de-setmana`) | yes                                       | no                                            |
| `/[place]/[category]` (16 categories, incl. `festes-populars`)  | yes                                       | partly: mixes every festivity                 |
| `/[place]/[date]/[category]`                                    | yes                                       | no                                            |
| `/[place]?search=…`, `?from=&to=`                               | no (client-side, `X-Robots-Tag: noindex`) | yes, but Google never sees it                 |
| `/sitemap/[town]/[year]/[month]`                                | yes                                       | no, a month archive                           |
| `/e/[event]`                                                    | until the event ends                      | one act; the URL dies after                   |
| `/noticies/[place]/[article]`                                   | yes                                       | only if an article exists                     |
| `/festa-major/[place](/[festa])`, `/festes-majors`              | when the index gates pass                 | yes                                           |

Why a separate segment and not `/[place]/festes-majors`:

- **Unknown category slugs redirect.** `/cardedeu/festes-majors` is read as a category; it's unknown, so the proxy 301s it to `/cardedeu`.
- **Listings are a different kind of page.** They are filtered lists, updated client-side with SWR, that fall back to the region or the latest events when a town has none. A programme needs grouping by festa and by day, last year's programme until the new one is out, and no unrelated events.
- **A festivity is a search term plus a date window.** Listings can only express that through query params, which stay noindex: indexing them caused the $300 cache incident (AGENTS.md › Hard rules). A festivity path segment would also multiply ~1,000 places × dates × categories × festivities.
- **It follows the search wording** ("festa major cardedeu 2026") and the existing pattern of `/noticies/[place]` and `/sitemap/[town]/…`. Both segments are in `NON_PLACE_FIRST_SEGMENTS`.

The hubs share the town and region data, the proxy's 404/301 checks (`checkPlace`), the event wrapper and the `place:<slug>` CDN tag with the listings. Hub pages link to the town listing, and festa major event pages link to the hub.

## 5. What the festa major hubs fix

| Problem                                                          | Fix                                                                                                                                                                       |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Searches land on one act, often of the wrong year                | One evergreen URL per town, titled "Festa Major de {town} {year}: programa i actes", with the whole programme                                                             |
| Event URLs die after the event (soft 404s), losing their ranking | The hub URL stays the same every year, showing this year's acts or last year's until the new ones exist                                                                   |
| Ranking event pages pass nothing on                              | Every festa major event page, past or upcoming, links to its town hub                                                                                                     |
| Thin or duplicate pages (the festacatalunya risk)                | Index gates: a town needs 5 or more acts, a region 2 or more such towns, a named festa page needs fewer acts than its town. Otherwise noindex and left out of the sitemap |
| Google finds new programmes slowly                               | A dedicated sitemap, IndexNow on publish, edit and delete, and CDN purge through `place:<slug>`                                                                           |

Not fixed yet:

- **Old dead event URLs** still return a soft 404. A 301 to the hub would pass their ranking on.
- **The hubs are hard to find on the site.** There is no link from the navbar, the home page or the town listings yet. The cheapest change is a "Festa Major de X" link on `/[place]` and `/[place]/festes-populars` when the town has a hub this year.
- **`/[place]/festes-majors` and `/[place]/festa-major`** could 301 to `/festa-major/[place]` instead of `/[place]`.
- **Town councils will keep #1** for their own festa. Our realistic target is #2–5.

## 6. Extending to other festivities

Most of the festa major code is generic already: deduping, grouping by
edition and day, the year choice, the index gates, the programme and calendar
views, the sitemap, IndexNow and the event-page link. Only these parts are
festa-specific:

- `FESTA_MAJOR_TERM`
- `extractFestaName` (named festes like Sant Roc or Gràcia)
- calendar years (`yearRange`, `yearOf`)
- the URL constants, the text and the names

`utils/festa-major-hub.ts` is also 390 lines, so it should be split.

Plan:

1. **One config, `config/festivities.ts`** (types in `types/festivity.ts`), in the same style as `config/filters.ts`. It holds `id`, `terms`, `titleRe`, `season` (start and end month-day, which may cross the year), `kind` (`town` or `type`), `segment`, `indexSegment`, `minActs` and an optional `nameExtractor`. Nothing else changes per festivity.
2. **Seasons, not calendar years.** `seasonRange(festivity, year)` replaces `yearRange`, and the year choice becomes a season choice. "Nadal 2026" is November 2026 to January 2027.
3. **One reader**, `fetchFestivityActs(festivity, place?, season)`. It fetches each term, merges with `dedupeActs` and keeps only titles that match `titleRe`, which removes the backend's substring matches. It keeps the existing `connection()`, cache and safe fallback.
4. **Two page kinds from the existing components:**
   - town pages (festa major, carnaval), which are today's hub;
   - type pages (Fires de Nadal, Pessebres vivents, Cavalcades de Reis), which are today's calendar view (by month, by region, town list).
5. **Thin route folders.** Each segment is a 3-line folder that calls a shared loader. I'd avoid a proxy rewrite. `NON_PLACE_FIRST_SEGMENTS` is built from the config, so its test covers new festivities, and segments stay Catalan in every locale.
6. **Text.**
   - Shared UI text lives once (`Pages.Festivity`).
   - Titles and intros live per festivity, because Catalan grammar differs: "Festa Major de X", "Carnaval de X", "Fires de Nadal a Catalunya".
7. **Indexing.**
   - One `server-festivity-sitemap.xml` loops over the enabled festivities.
   - `festivityHubPathsFor(events)` feeds IndexNow.
   - Type pages get a `festivity:<id>` CDN tag, purged when a matching event changes.
   - The event-page link uses `matchFestivity(title)`; the first match in config order wins.

Edge cases:

| Case                                                    | Handling                                                                |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| A season that crosses the year (Nadal, Reis)            | Season windows; tests on 31 Dec and 7 Jan                               |
| Carnaval moves with Easter                              | A wide season window; the acts set the dates                            |
| False matches ("Rafa Nadal", "reis" inside other words) | `titleRe` with word boundaries, tested on real titles saved as fixtures |
| An event matching two festivities                       | Config order decides; tested                                            |
| Thin pages                                              | `minActs` per festivity; type pages need ≥2 regions with acts           |
| Off season                                              | Last season plus "not announced yet"                                    |
| Backend down                                            | Unavailable notice, short cache, default robots                         |
| Unknown town                                            | The proxy's `checkPlace` gives the real 404 or 301                      |
| Too many cache entries                                  | No `searchParams`; pages are festivity × town only                      |
| Backend calls per term                                  | Few terms, cached calendar, merged before caching                       |

Order, as separate PRs:

1. **Refactor only.** The HTML of 5 hub pages, the sitemap and the event-page link must be byte-identical before and after (`curl` + `diff`). Engine tests run once; each festivity adds only a fixture table of titles.
2. **Nadal type pages.** The season starts mid-November.
3. **Carnaval town pages,** after the big carnivals are sources. Ship by January 2027.

### What shipped (Nadal, 2026-11)

The Nadal pages followed this plan with less machinery: one shared season and type pages only (no town pages yet).

- **Config:** `config/festivities.ts` lists the 3 types with their search `terms`, an `include` regex on the normalised title, an `exclude` regex (registrations, workshops, letters to the Reis) and a `yearOffset` (the Reis page is titled with January's year). `FESTIVITY_SEASON` is 1 November to 10 January.
- **Data:** `lib/api/festivities.ts` fetches this season and the last one per type, keeps titles that match, and dedupes (same id, or same title, town and day). Pages show upcoming events as cards, past ones as rows, and towns that had one last season but no date yet as "Pendents de confirmar".
- **Nothing to update by hand each year.** `seasonYearOf(today)` picks the season, titles take the year from it, and the sections move on their own as dates pass: upcoming → past at the end date, and on 1 November last season becomes the "pending" reference. Data refreshes hourly in the background (`cacheLife`); Cloudflare adds up to 30 min. It is not tagged `events`: a rebuild is up to ~180 backend requests, and a publish would expire it with no stale copy. The copy says "el Nadal passat", not "l'any passat", so it stays right in early January. Out of season (February–October), the pages show last season's towns as pending and keep their index status.
- **What does need a person:** a new festivity type (a config entry, a route, its text, its segment), a different season window, or a title wording the regex doesn't catch. To check the regex, run the "Acts per festivity" query in section 8 and look at titles that were left out.
- **Visuals:** cards for upcoming events; 56 px thumbnails on rows and on the festa major town lists (`Thumbnail`, image context `thumb`, 120 px, lazy); a cover on each festa major town hub (its first act with an image, the page's one priority image, preloaded with `ImagePreload`). Rows with no image show the town's initial.
- **Copy:** rewritten after reading betevé, 3Cat and Diba, which write short, concrete text (tions, caganers, actors and animals, the 5 January afternoon), not generic "calendar" text. Checked with the Softcatalà corrector.

### Backend problems found

- **esdeveniments-backend#63:** `GET /events` with `from`/`to` and no `place` has no `ORDER BY`, so each page comes back in a new order. Paging "festa major 2026" (1,275 events) got only 655–843 of them. It also affects `/catalunya/avui|dema|setmana|cap-de-setmana` "load more". Until it's fixed, `fetchAllEventPagesExternal` splits a range into day windows that each fit one 50-event page (about 95 requests for the whole year, 1,275 of 1,275 found). Related: `size` is capped at 50, and `sort` and `byDate` are ignored.
- **esdeveniments-backend#64:** 46 of 269 card images on these pages (17%) don't load: 23 source files are gone (404), 8 are over the proxy's 5 MB limit and 4 sites block hotlinking (403). The fix is to store a copy of each image when an event is scraped.

## 7. Not in scope

- **#542** (splitting a programme poster into its acts) would add towns. It needs a labelled ground-truth set first.
- **A "recurring" flag for organizers**, which would give named fairs and events a permanent URL, needs a backend schema change in the backend repo.

## 8. Measuring and re-running

- **Target:** 3× the 2026 baseline next season, i.e. 42 clicks at position 16.1 on festa major searches and 589 clicks on festa major event pages. Track Search Console clicks by page segment (`/festa-major/`, `/carnaval/`, …).
- **Search Console:**
  - Request `searchAnalytics/query` on `sc-domain:esdeveniments.cat` with dimension `query`, a `dimensionFilterGroups` filter using `includingRegex` (for example `festa major|carnaval|carnestoltes`), and the header `x-goog-user-project: esdeveniments-3`.
  - Authenticate with the `gcloud` login in section 4 of [`paid-acquisition-research-2026-11.md`](./paid-acquisition-research-2026-11.md).
  - `month` is not a valid dimension; use `date`.
- **Keyword Planner:**
  - Use `GenerateKeywordHistoricalMetrics` with geo `2724` (Spain) and the Google Search network.
  - The Google Ads credentials live in the opportunity-radar repo (`scripts/keyword-planner.py`).
  - Wait about 10 s between calls, or it returns 429 `RESOURCE_EXHAUSTED`.
  - Keyword ideas return almost nothing for these seeds; list exact "{festivity} {town}" keywords instead.
- **Acts per festivity:** `GET /api/events?term=<term>&from=<date>&to=<date>&size=100&page=N` on the public site. Keep only titles that really contain the term, and count acts per `city.slug`.
