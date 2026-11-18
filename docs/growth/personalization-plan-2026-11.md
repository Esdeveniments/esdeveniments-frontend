# Personalised events ("Per a tu"): data and plan (2026-11-15)

The idea: learn what each visitor likes (categories, towns, days) and rank
events for them, with a "why am I seeing this" line, and later use the
aggregated demand per town and comarca. This doc checks the idea against our
numbers and sets the order of work. Short version: measure first, personalise
the event page before the home page, and keep any profile on the device until
the numbers say more people come back.

## 0. Sources and limits

| Source | What | Limits |
| --- | --- | --- |
| GA4 Data API | Property 406884331, country = Spain, 2026-10-18 → 2026-11-14 (28 days) | Consent Mode: only visitors who accepted analytics are counted, so totals are a floor. Ratios matter more than totals |
| GA4 Admin (read) | Registered custom dimensions | `category_slug` was sent but not registered (§3) |
| Search Console | From `traffic-decline-analysis-2026-11.md` | Monthly clicks only |
| Code | `useEventAnalytics.ts`, `FavoriteButton`, `CardLayout`, `CompactCardView`, `GoogleScriptsHeavy.tsx` | Read on 2026-11-15 |

## 1. What the data says

| Metric (GA4, Spain, 28 days) | Value |
| --- | --- |
| Active users | 1,740 |
| Returning users | 138 (8%) |
| `view_event_page` | 1,282 events, 997 users |
| `select_event` (card click) | 193 events, 128 users |
| `related_event_click` | 50 (3.9% of event views) |
| `share` | 8 |
| `favorite_add` | 5 (4 users) |
| `add_to_calendar` | 1 |
| `zero_results` (search) | 26 |

- 92% of visitors come once. Most land on an event page from Google
  (event pages are 1,221 of 1,296 search clicks in October 2026, see the
  traffic-decline doc), and home gets about 12 search clicks a month.
- Strong signals (save, share, calendar) add up to 14 in four weeks. A
  per-person interest score needs many of them per person; we have far less
  than one per person.
- Over 12 months, 10% of users came back (`paid-acquisition-research-2026-11.md`).

So a home "Per a tu" built on a learned profile would reach about 140 people
a month, and most of them with one or two signals each. For everyone else the
best signal we have is the event they are looking at right now.

## 2. Decisions

1. **Measure before ranking.** Tag every interaction with the event's
   category and place, so we can group views, clicks and saves the same way
   (§3). Done in this change.
2. **Personalise the event page first.** The related-events row already shows
   other events on the event page, and 3.9% of views click one. Ranking that
   row by "same category nearby" against "same town, any category" is a
   test that reaches all visitors, needs no profile and no consent beyond
   what we have.
3. **Keep the first profile on the device.** For returning visitors, keep the
   last categories and towns they viewed in `localStorage`, never on our
   server, with a "why" line on each pick and a button to clear it. No
   backend change, nothing to store, nothing to delete on request.
4. **Server profiles for signed-in users only, and later.** Only when the
   signed-in and returning numbers grow (§5). Needs a legal basis, a
   retention period, an opt-out in the profile and a privacy policy update.
5. **No machine learning and no LLM for ranking.** A weighted score
   (interest, distance, date, popularity, a share of other categories) is
   enough at our volume and easy to explain in the "why" line.

## 3. Phase 0: instrumentation (this change)

Every event below now carries the event's first category and its town (or
its region when it has no town), from one helper, `getEventAnalyticsSlugs` in
`utils/event-helpers.ts`. Card clicks send the pair as `event_category_slug`
and `event_place_slug`, because their `category_slug` and `place_slug` already
hold the listing page's filters (set on the list container), and those stay.

| GA4 event | Before | Now |
| --- | --- | --- |
| `view_event_page` | `category_slug`, `place_slug` of the event | same, from the helper |
| `select_event` (listing and home cards) | event id and slug; on listings also the page's `category_slug`, `place_slug` | + `event_category_slug`, `event_place_slug`, numeric `position` (slot), and home row `context` (`home_popular`, `home_featured_place`, `home_category`) |
| `related_event_click` | event id, slug, position, source event id and slug | + `event_category_slug`, `event_place_slug`, and the viewed event's `category_slug`, `place_slug` |
| `map_event_click` | event id, slug, position | + `event_category_slug`, `event_place_slug` |
| `favorite_add`, `favorite_remove` | event id and slug | + `category_slug`, `place_slug` of the event |
| `share`, `add_to_calendar`, `sticky_cta_click`, event `outbound_click` | method or link target | + `category_slug`, `place_slug` (and `event_id`, `event_slug` where applicable) |
| `search_outcome`, `zero_results`, `search_results_loaded` | `zero_results` sent `place` and `category`; `search_outcome` sent no place | + `place_slug` and `category_slug` across all three (`place` kept for dashboards) |
| `view_item_list` (listings and carousels) | `card_impression_batch` sent only how many cards were seen | which events were seen across listings (`listing`), home rows (`home_*`), promoted rows (`promoted_*`) and the related row (`related_events`): one item per card with `item_id`, `item_category`, `item_category2` and `index` |
| `card_stop` (listings and carousels) | none | one flat event per stopped card on page hide or unmount (up to the 10 longest stops per flush) for cards whose active-tab dwell beat the visitor's page median (`1.75x`, at least `2.5 s` across 4+ seen cards across the listing or across all carousels on the page), carrying `event_id`, `event_category_slug`, `event_place_slug`, `position`, `dwell_ms`, `total_cards` and `item_list_name` |

Listing and search helpers also strip the internal `"tots"` sentinel (`omitDefaultFilterValue` in `utils/constants.ts`) so `category_slug` and `date` stay omitted whenever no real category or date filter is active.

`view_item_list` is GA4's standard event for "items shown in a list". Its item
fields are built-in dimensions (Item ID, Item category, Item category 2, Item
list position, Item list name), so it uses none of the 50 custom dimension slots. On listings it goes out
in the same 2 s batch as `card_impression_batch`, which stays for the
dashboards (`scripts/ga-dashboard.py`). Ad slots have no event, so they are
skipped. Both now watch the whole listing: before this change the observer
only got the load-more wrapper, which exists after "load more", so
`card_impression_batch`, `listing_scroll_depth` and their `total_cards` left
out every server-rendered card. Expect those numbers to jump from the release
day. A card's `index` counts across the server grid and the load-more grid;
a grid hidden by client filters is skipped. GA4's own "item list click-through rate" stays empty, because card
clicks are `select_event` or `related_event_click`, not `select_item`: join on the event id in
BigQuery instead.

Registered in GA4 Admin on 2026-11-15:
`category_slug`, `event_category_slug` and `event_place_slug` as
event-scoped custom dimensions (`place_slug` and `place` were already registered). That uses 47 of the 50 event-scoped
dimensions.

Known upstream gap (checked 2026-11-17): municipal `RSS` sources in
`esdeveniments-backend` currently run with `categorizationEnabled` off because
builder-made `RSS` events had `categories == null` (`Esdeveniments/esdeveniments-backend#115`),
so 44% of `view_event_page` hits on 2026-11-16 arrived with an empty
`category_slug` (0% empty in Barcelona, Lleida and Tarragona; 58% empty in
Maresme). Once `Esdeveniments/esdeveniments-backend#115` is deployed, enable
`categorizationEnabled` on active `RSS` sources so town events carry categories
too.

### BigQuery export (free)

GA4 keeps event data 14 months, its reports can't follow one visitor from
view to save, and custom parameters need one of the 50 slots. The BigQuery
export copies every event with all its parameters into our Google Cloud
project, where SQL can do all three.

It goes to `esdeveniments`, the main Cloud project (Maps, Places, Search
Console, Cloud Run), which already has billing on. A project without billing
runs in the BigQuery sandbox, which deletes every table after 60 days.

| Fact | Value | Source |
| --- | --- | --- |
| Our volume | 69,721 events in 28 days (~2,500 a day, all countries) | GA4 Data API, 2026-10-18 → 2026-11-14 |
| Daily export limit | 1 million events a day | GA4 help, "Set up BigQuery Export" |
| Free use | 10 GiB of storage and 1 TiB of queries a month | BigQuery pricing |
| Sandbox (no billing) | Every table deleted after 60 days, no streaming | BigQuery docs, "Use the BigQuery sandbox" |
| Projects | `esdeveniments` billing on; `esdeveniments-3` and `-prod` billing off | `gcloud`, 2026-11-15 |

Steps (needs Editor on the GA4 property and Owner on the Cloud project):

1. GA4 Admin → Product links → BigQuery links → Link.
2. Choose BigQuery project → `esdeveniments` → Confirm.
3. Data location: an EU location (the data is about EU visitors). It can't
   be changed later.
4. Data streams: the web stream, no excluded events.
5. Frequency: Daily.
6. Submit. The first daily table (`analytics_406884331.events_YYYYMMDD`)
   shows up within a day.

To keep it at no cost (both set on 2026-11-15):

- Billing → Budgets & alerts: "BigQuery (esdeveniments) €1", a monthly budget
  on this project's BigQuery and BigQuery Storage API spend only (Maps,
  Places and Cloud Run also bill here), with email alerts at 50, 90 and
  100%. A budget only warns; it doesn't stop spending.
- IAM & Admin → Quotas: "BigQuery API, Query usage per day" at 32 GiB. Over
  31 days that is 992 GiB, under the free 1 TiB a month, so a runaway query
  fails instead of costing money. Lowering a quota by more than 10% needs
  Google's safety check overridden on purpose.

## 4. Questions to answer after four weeks

Each one is a GA4 report or exploration with the event's category and place
(`category_slug`/`place_slug` on views and saves, `event_*` on card clicks):

- Do people who view a category click and save the same category? Compare
  the category mix of `view_event_page` with `select_event` and
  `favorite_add`, per user, in a user exploration.
- Does place matter more than category? For `related_event_click`, compare
  how often `event_place_slug` matches `place_slug` (the viewed event's town)
  against how often `event_category_slug` matches `category_slug`.
- Which categories bring people back? `view_event_page` by category, split
  by new and returning users.
- Where is demand without supply? `zero_results` and `search_outcome` by
  place, next to the number of events per place.

## 5. When to move to the next phase

| Next step | Start when |
| --- | --- |
| Related-events ranking test (event page) | Phase 0 has four weeks of data with `category_slug` registered |
| On-device "Per a tu" row on home | The test above raises `related_event_click` per event view, and returning users stay at 8% or more |
| Server profile for signed-in users | Signed-in returning users reach a few hundred a month |
| Demand report per comarca (for town halls and organisers) | Enough searches per comarca to show a pattern; today it is 26 zero-result searches a month in total |

Success is not only more clicks: track saves, shares and returning users for
the people who saw the ranked row, against those who saw the current order.

## 6. What the big feeds measure in a scroll list

Checked on 2026-11-15, from the companies' own posts and code where they exist.

| Platform | What they read from scrolling | Source |
| --- | --- | --- |
| Facebook (2015) | Time a post stays on screen counts even with no like. A post counts as interesting only when the person spent much longer on it than on most posts they see, because ten seconds can also mean a slow connection | about.fb.com, "Taking into account time spent on stories" (2015-06-12) |
| LinkedIn | Feed dwell time starts when at least half of a post is visible. First model: probability of a skip (dwell under a threshold). Now a "long dwell" label: dwell above a percentile that depends on position, content type and device, recalculated every day. A click followed by a quick return to the feed is a "click bounce" and is treated as noise | LinkedIn Engineering, "Leveraging dwell time to improve member experiences" (2024); LiRank, arXiv 2402.06859 |
| X | The ranker predicts ten actions and adds them with weights. Like 0.5, reply 13.5, "good click" (opens and replies or likes) 11, "good click v2" (opens and stays 2 minutes) 10, half a video watched 0.005, "show less" or block −74, report −369. Weights were set so each action adds about the same on average | `twitter/the-algorithm-ml`, `projects/home/recap/README.md` (weights of 2023-04-05) |
| YouTube | Clicks, watch time, likes, dislikes, shares, "not interested", plus star surveys. Only watch time on videos rated 4 or 5 stars counts as "valued watch time"; a model predicts the rating for everyone else | YouTube blog, "On YouTube's recommendation system" (2021-09-15) |
| TikTok | Finishing a longer video weighs more than weak signals like being in the same country as the creator. Likes, shares, comments and follows are named as interest signals, with no published weights | TikTok newsroom, "How TikTok recommends videos #ForYou" (2020) |
| Instagram | Predicts per post whether you will watch, like, share or save it, and checks the models with "worth your time" surveys | Adam Mosseri's ranking posts (secondary sources only) |

What they share:

- **An impression needs real visibility**: about half the item on screen,
  with the tab active. A card rendered below the fold is not seen.
- **Dwell is compared with a baseline.** Time on an item means something only
  against the same person's usual time, the item's position and its type.
- **A fast skip is a signal too**, and a weak negative one.
- **A click is checked by what follows it.** A click and a quick return is
  closer to a skip than to interest.
- **Explicit actions weigh far more than passive ones**, and "show less" or
  a report weighs most of all, in the negative.
- **Surveys keep the model honest**, so it doesn't learn to chase easy
  attention.

What this means for us:

- The same rules fit our listings: a card is seen when half of it is on
  screen in a visible tab (`useListingAnalytics` uses an IntersectionObserver
  at 50% and now reports which events were seen with `view_item_list`),
  a "stop" is a card that stays on screen well above that person's median,
  and a "good click" is an event page where the visitor reaches the
  description or location section (`section_view` exists) or clicks the
  ticket link (`outbound_click`), against a return to the list within a few
  seconds.
- These feeds learn per person from hundreds of items a day. Our visitor sees
  one or two pages and leaves (§1). Per-card stops are worth more added up per
  event and per town: an event that makes people stop is a good candidate to
  rank higher for everyone, which also helps new events that have no clicks
  yet.
- GA4 BigQuery Export leaves `items` empty on custom event names (verified in
  `events_20261117` when the first release sent `card_stop_batch`), and GA4
  cuts string parameters at 100 characters. So each qualifying pause goes out
  as one flat `card_stop` event (capped at the 10 longest pauses per flush),
  reusing the registered `event_category_slug`, `event_place_slug`,
  `total_cards` and `position` slots. Across the first 14 live hours, visitors
  triggered 14 stopped cards in total, against a 1,000,000-event daily free
  export cap.

## 7. First post-deploy findings and BigQuery queries (2026-11-18)

Checked on 2026-11-18 across `esdeveniments.analytics_406884331.events_20261114`
to `events_20261117` (415 consented users in Spain, 440 sessions with a
`page_view`, non-Spain bot traffic excluded) plus processed GA4 rows from the
first 22 hours after `#827` shipped (`2026-11-17 14:49 CET`).

### What the first 4 days of BigQuery show

| Entry surface (`geo.country = "Spain"`, Nov 14 to 17) | Sessions | Share | Avg `page_view`s | Continued to 2+ pages |
| --- | --- | --- | --- | --- |
| Event detail (`/e/...`) | 315 | 71.6% | 1.65 | 135 (42.9%) |
| Place or category listing (`/[place]...`) | 76 | 17.3% | 4.50 | 44 (57.9%) |
| Festivity hub (`/fires-de-nadal`, `/carnaval`, ...) | 25 | 5.7% | 2.12 | 13 (52.0%) |
| Home (`/`, `/es`, `/en`) | 20 | 4.5% | 4.55 | 18 (90.0%) |
| News (`/noticies...`) | 4 | 0.9% | 2.75 | 4 (100%) |

1. **Event detail and town listings are the real "Per a tu" surfaces.** Only
   4.5% of sessions start on home, while 71.6% land straight on an event page
   from Google or AI assistants (`ai_referrer` logged 23 hits from 21 Spain
   users across Nov 15 to 18), and 42.9% of those event landers open a second
   page. A recommendation block that only existed on `/` would miss 95% of
   visitors. Rank the bottom of `/e/[eventId]` first, town and comarca
   listings second, and home third.
2. **Geography stays fixed while category varies.** Across the 52 Spain
   visitors who opened 2 or more event pages (3.90 event views per person on
   average, and 32 returning for a second session within 4 days), 45 of 52
   (86.5%) stayed inside one town and only 7 (13.5%) crossed towns. Among the
   33 multi-event visitors whose viewed events carried categories, 10 (30.3%)
   crossed into a second category inside that town. Filter candidates to the
   visitor's town and comarca before scoring category affinity; never surface
   a matching category 100 km away.
3. **Municipal RSS feeds hold back a third of category labels.** Across Nov 15
   to 17 in Spain, 102 of 320 `view_event_page` hits (31.9%) had an empty
   `category_slug`, concentrated in municipal RSS towns (`el-masnou`,
   `sant-andreu-de-llavaneres`, `sant-pere-de-riudebitlles`, `vallgorguina`).
   Shipping `Esdeveniments/esdeveniments-backend#115` and enabling
   `categorizationEnabled` in `esdeveniments-dashboard` remains the largest
   data fix before the 4-week review.
4. **Live Day-1 verification caught two collector quirks.** Every `#827`
   signal fired in production within hours (`related_event_click` with
   `position`, 49 `related_events` carousel impressions across 10 categories,
   empty-town fallback impressions on `/garrigoles`, and full slugs on search,
   sticky CTA, calendar and ticket clicks). Two edge cases showed up in raw
   rows and are fixed in the follow-up PR:
   - `card_stop_batch` fired 6 batches (`1/5` cards in Barcelona, `1/5` and
     `1/6` in Vilanova, `3/12` on `/catalunya`, and `4/36` on home's
     `fires-i-mercats` and `familia-i-infants` rows), proving the `1.75x`
     median threshold holds in real browsing, while BigQuery showed Google
     dropped `items` on custom event names (replaced by flat `card_stop`).
   - Date-filtered place routes (`/[place]/[byDate]`) and the sticky search
     layer passed the internal `"tots"` default as `category_slug`
     (replaced by `omitDefaultFilterValue`).

### Reusable BigQuery queries for the 4-week checkpoint

Run against `esdeveniments.analytics_406884331.events_*` (stay within a
28-day `_TABLE_SUFFIX` window so each query scans a few megabytes under the
32 GiB daily quota):

```sql
-- 1. True session-joined card funnel by card category (Spain, 28 days):
--    seen in list -> scroll stop -> card click -> good click (section_view or strong action on opened event)
WITH raw AS (
  SELECT
    user_pseudo_id,
    (SELECT value.int_value FROM UNNEST(event_params) WHERE key = "ga_session_id") AS session_id,
    event_timestamp,
    event_name,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = "event_id") AS param_event_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = "section") AS section,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = "page_location") AS page_location,
    (SELECT value.int_value FROM UNNEST(event_params) WHERE key = "dwell_ms") AS dwell_ms,
    items
  FROM `esdeveniments.analytics_406884331.events_*`
  WHERE _TABLE_SUFFIX BETWEEN FORMAT_DATE("%Y%m%d", DATE_SUB(CURRENT_DATE(), INTERVAL 28 DAY))
                          AND FORMAT_DATE("%Y%m%d", DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))
    AND geo.country = "Spain"
),
seen_cards AS (
  SELECT
    user_pseudo_id,
    session_id,
    i.item_id AS event_id,
    COALESCE(NULLIF(NULLIF(i.item_category, "(not set)"), ""), "(uncategorized)") AS category,
    MIN(event_timestamp) AS first_seen_ts
  FROM raw, UNNEST(items) AS i
  WHERE event_name = "view_item_list" AND i.item_id IS NOT NULL
  GROUP BY user_pseudo_id, session_id, event_id, category
),
stopped_cards AS (
  SELECT
    user_pseudo_id,
    session_id,
    param_event_id AS event_id,
    MAX(dwell_ms) AS max_dwell_ms,
    MIN(event_timestamp) AS first_stop_ts
  FROM raw
  WHERE event_name = "card_stop" AND param_event_id IS NOT NULL
  GROUP BY user_pseudo_id, session_id, event_id
),
clicked_cards AS (
  SELECT
    user_pseudo_id,
    session_id,
    param_event_id AS event_id,
    MIN(event_timestamp) AS first_click_ts
  FROM raw
  WHERE event_name IN ("select_event", "related_event_click") AND param_event_id IS NOT NULL
  GROUP BY user_pseudo_id, session_id, event_id
),
opened_events AS (
  SELECT
    user_pseudo_id,
    session_id,
    param_event_id AS event_id,
    page_location,
    MIN(event_timestamp) AS open_ts
  FROM raw
  WHERE event_name = "view_event_page" AND param_event_id IS NOT NULL
  GROUP BY user_pseudo_id, session_id, event_id, page_location
),
good_opens AS (
  SELECT DISTINCT
    o.user_pseudo_id,
    o.session_id,
    o.event_id,
    o.open_ts
  FROM opened_events o
  JOIN raw r
    ON r.user_pseudo_id = o.user_pseudo_id
   AND r.session_id = o.session_id
   AND r.event_timestamp >= o.open_ts
   AND (
     (r.event_name = "section_view" AND r.page_location = o.page_location AND r.section IN ("description", "location"))
     OR (r.event_name IN ("outbound_click", "favorite_add", "share", "add_to_calendar")
         AND (r.param_event_id = o.event_id OR r.page_location = o.page_location))
   )
)
SELECT
  s.category,
  COUNT(*) AS seen_cards,
  COUNTIF(st.event_id IS NOT NULL AND st.first_stop_ts >= s.first_seen_ts) AS stopped_cards,
  ROUND(AVG(IF(st.first_stop_ts >= s.first_seen_ts, st.max_dwell_ms, NULL)), 0) AS avg_stop_ms,
  COUNTIF(c.event_id IS NOT NULL AND c.first_click_ts >= s.first_seen_ts) AS clicked_cards,
  COUNTIF(c.first_click_ts >= s.first_seen_ts AND g.open_ts >= c.first_click_ts) AS good_clicks,
  ROUND(100.0 * COUNTIF(c.first_click_ts >= s.first_seen_ts) / NULLIF(COUNT(*), 0), 2) AS ctr_pct,
  ROUND(100.0 * COUNTIF(c.first_click_ts >= s.first_seen_ts AND g.open_ts >= c.first_click_ts) / NULLIF(COUNT(*), 0), 2) AS good_ctr_pct
FROM seen_cards s
LEFT JOIN stopped_cards st USING (user_pseudo_id, session_id, event_id)
LEFT JOIN clicked_cards c USING (user_pseudo_id, session_id, event_id)
LEFT JOIN (
  SELECT user_pseudo_id, session_id, event_id, MAX(open_ts) AS open_ts
  FROM good_opens
  GROUP BY user_pseudo_id, session_id, event_id
) g USING (user_pseudo_id, session_id, event_id)
GROUP BY s.category
ORDER BY seen_cards DESC;
```

```sql
-- 2. Related-events town match vs category match with comparable non-null denominators (§4 Question 2)
SELECT
  COUNT(*) AS related_clicks,
  COUNTIF(event_place IS NOT NULL AND source_place IS NOT NULL) AS comparable_town_pairs,
  COUNTIF(event_place = source_place AND source_place IS NOT NULL) AS same_town_clicks,
  ROUND(100.0 * COUNTIF(event_place = source_place AND source_place IS NOT NULL)
        / NULLIF(COUNTIF(event_place IS NOT NULL AND source_place IS NOT NULL), 0), 1) AS same_town_pct,
  COUNTIF(event_cat IS NOT NULL AND source_cat IS NOT NULL) AS comparable_category_pairs,
  COUNTIF(event_cat = source_cat AND source_cat IS NOT NULL) AS same_category_clicks,
  ROUND(100.0 * COUNTIF(event_cat = source_cat AND source_cat IS NOT NULL)
        / NULLIF(COUNTIF(event_cat IS NOT NULL AND source_cat IS NOT NULL), 0), 1) AS same_category_pct,
  ROUND(AVG(position), 2) AS avg_clicked_slot
FROM (
  SELECT
    NULLIF((SELECT value.string_value FROM UNNEST(event_params) WHERE key = "event_place_slug"), "") AS event_place,
    NULLIF((SELECT value.string_value FROM UNNEST(event_params) WHERE key = "place_slug"), "") AS source_place,
    NULLIF((SELECT value.string_value FROM UNNEST(event_params) WHERE key = "event_category_slug"), "") AS event_cat,
    NULLIF((SELECT value.string_value FROM UNNEST(event_params) WHERE key = "category_slug"), "") AS source_cat,
    (SELECT value.int_value FROM UNNEST(event_params) WHERE key = "position") AS position
  FROM `esdeveniments.analytics_406884331.events_*`
  WHERE _TABLE_SUFFIX BETWEEN FORMAT_DATE("%Y%m%d", DATE_SUB(CURRENT_DATE(), INTERVAL 28 DAY))
                          AND FORMAT_DATE("%Y%m%d", DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))
    AND geo.country = "Spain"
    AND event_name = "related_event_click"
);
```

