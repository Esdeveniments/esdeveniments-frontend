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
| `select_event` (listing and home cards) | event id and slug; on listings also the page's `category_slug`, `place_slug` | + `event_category_slug`, `event_place_slug` |
| `related_event_click` | event id, slug, position, source event id and slug | + `event_category_slug`, `event_place_slug`, and the viewed event's `category_slug`, `place_slug` |
| `map_event_click` | event id, slug, position | + `event_category_slug`, `event_place_slug` |
| `favorite_add`, `favorite_remove` | event id and slug | + `category_slug`, `place_slug` of the event |

Manual step (needs GA4 edit access; the local credentials are read-only):
register `category_slug`, `event_category_slug` and `event_place_slug` as
event-scoped custom dimensions in GA4 Admin → Custom definitions.
`place_slug` is already registered. That makes 47 of the 50 event-scoped
dimensions. GA4 only fills a dimension from the day it is registered, so do
it before the four weeks start.

Left for later, on purpose: `share` and `add_to_calendar` (14 events in four
weeks, and their buttons don't receive the event's category today) and the
card's position in listings (only numbered lists pass it).

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
  screen in a visible tab (`useListingAnalytics` already uses an
  IntersectionObserver for `card_impression_batch`, but sends only counts),
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
- Sending one GA event per card stop would multiply our event volume. Send
  one batch per page instead, with the event ids that got a stop.
