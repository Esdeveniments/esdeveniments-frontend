# Paid acquisition research (2026-11-07)

Should esdeveniments.cat pay for traffic, and where? This doc covers our own
data (GA4, Search Console), outside benchmarks checked against their sources,
and a test plan. Numbers age fast: re-run the queries below before you act on
them.

## 1. Our data (GA4 property 406884331, Search Console, to 2026-11-06)

### GA4 needs cleaning before you read it

- **About 75% of GA4 "users" are bots.** 12-month total: 144K users. China
  (30K), Singapore (27K), the US (12K) and Japan (11K) add up to most of them:
  desktop, "Direct", average session 0.4–6 s. The June 2026 spike (57.6K users)
  is bots: Spain had 3.6K users that month. Bots are still there (last 28 days:
  8K Direct users in total, 203 from Spain). **Filter on `country = Spain`
  (or engaged sessions) for every analysis.**
- **Data before 2026-08-17 is inflated.** Cloudflare Zaraz also sent GA4 hits
  ([incident](../incidents/2026-08-18-zaraz-zone-wide-google-tags.md)).
  Spain Google-organic sessions in GA4 divided by Search Console clicks were
  1.6–1.9 each week until the week of 2026-08-10, then 0.7–1.0 from the week
  of 2026-08-17 onwards.
  Compare only from 2026-08-17 on.
- **GA4 counts only consented visitors** (Consent Mode v2, everything denied
  by default) and is too small for Google to model the rest. Treat it as a
  lower bound. Landing `page_view` consent was fixed on 2026-11-06 (#680), so
  counts may rise from that date: that's a tracking change, not growth.
- The "10K+ monthly users" figure in the GitHub org README is not real human
  traffic.

### Real baseline (Spain only)

| Metric | Value |
|---|---|
| Users / month (Sep–Oct 2026, after Zaraz) | ~1.3K–1.6K |
| Search Console clicks / month (12 months) | 0.86K–1.46K, steady ~1.2K |
| Search Console, 12 months | 14.3K clicks, 593K impressions, CTR 2.4%, avg position 16.2, 98% Spain |
| Channels, last 28 days | Organic 1,001 users (69%), Direct 203, AI assistants 194 (13%), Social 21, Referral 17 |
| Returning users (12 months) | 3.2K of 31.1K (~10%); their sessions last 163 s vs 109 s |
| Device | Mobile 65%, desktop 34% |
| Browser language | Spanish 59%, Catalan 33%, English 7% |
| Where | Catalonia 85%. Barcelona city is 46% of Catalonia users; then Granollers, Mataró, Terrassa, Arenys de Mar, Badalona, Vic |
| Day of week | Sat > Fri > Sun > Thu; Tue/Wed lowest |
| Known ages (few users) | 45–54, 55–64 and 65+ are about 3× the 25–44 groups |
| Retention prompts (12 months, all countries) | Push offer seen by 648 users, dismissed by 528; PWA prompt reached 803 users |

### Dashboards (checked by hand, 2026-11-07)

- **AdSense** (publisher `pub-2456713018173238`; the account also has
  iotastaking.com, ~€0.11/week):
  - Last 12 months (2025-11-07 → 2026-11-06), whole account: **€76.60**,
    87.9K page views, page RPM €0.87, 1,056 clicks. So esdeveniments.cat
    earns about **€6/month**.
  - Last 3 years: €276, 210K page views, RPM €1.31.
  - Last 7 days: €1.67 from esdeveniments.cat, 1.66K page views (−83% year on
    year; the Zaraz-era counts were inflated), CPC €0.06.
  - Balance €55.49, so no payout until it reaches the threshold.
- **Google Ads**: account "Esdeveniments" (467-859-2752) exists with
  **0 campaigns**; "Albert" (894-725-1873) is cancelled and 603-077-7929 is an
  unfinished setup. Keyword Planner says "select an active account", so it
  needs billing set up before it shows volumes.
- **Meta Ad Library** (Spain, active ads): "què fer" ~1,900 ads, "agenda
  cultural" ~57, "planes barcelona" ~320. None from a Catalan event agenda;
  the advertisers are Fever, venues, hotels and local brands. Nobody bids on
  our niche there.
- **Cloudflare**: the dashboard blocks the automated browser, so the Zaraz
  state and visitor counts are still unchecked.

### Search Console: where we win and lose

- **Town pages lost their ranking over the year.** This is the biggest finding.
  Single-segment place pages (`/arenys-de-munt`, `/el-masnou`, …):
  - Nov 2025: 178 clicks, average position 15.
  - Oct 2026: 23 clicks, position 44. About 50 clicks/week then, about 2 now.
  - The decline is gradual, with steps in mid-April and July 2026; there is no
    single break.
  - Examples (Nov–Jan vs Aug–Oct): `/arenys-de-munt` 74 clicks at pos 10 →
    0 at pos 14 (impressions 1,156 → 43); `/el-masnou` 42 → 4;
    `/malgrat-de-mar` 31 → 3; `/la-garriga` 12 → 0.
  - Event pages (`/e/…`) and filtered listings (`/[place]/[date]`) are stable,
    so it isn't site-wide.
  - Not an indexing bug: URL Inspection says "Submitted and indexed" with
    Google's canonical equal to ours (checked for 5 towns).
  - Who ranks above us (Google, 2026-11-07): the town council, then
    femturisme.cat ("Agenda X: fires, festes, mercats, concerts…", one page per
    town), then local sites. Google shows an AI Overview for "agenda el masnou"
    and "agenda la garriga".
  - Our pages are thin: 250–400 words, 4–30 events. The title template changed
    on 2025-12-28 and 2026-01-01 (`messages/*.json`, `metaTitle`), but the
    decline started earlier and kept going, so the title alone doesn't explain
    it. **Cause unproven.**
- Low CTR on "agenda arenys de mar" and similar (12-month average position 7–9)
  is the same story: those pages slid from pos ~9 to ~19, so a title rewrite
  won't fix it.
- **Weekend comarca pages already exist** (`/osona/cap-de-setmana`, …),
  indexed, 30 events each. "agenda maresme cap de setmana" ranks at pos 7.5.
- **Head terms we don't rank for** (Spain, 2026-08-07 → 11-05, impressions /
  position): "agenda cap de setmana osona" 312/23, "que fer aquest cap de
  setmana" 296/39, "agenda cap de setmana" 169/23, "activitats culturals"
  160/41, "que fer avui" 155/51, "agenda catalunya" 153/35, "agenda valles
  oriental" 104/18, "que fer al maresme" 99/22, "on anar aquest cap de setmana"
  91/24, Granollers terms 80–85 each at pos 23–32. Impressions are a lower
  bound of demand.

## 2. Outside facts (checked against sources, 2026)

- The round-1 CPCs ($0.03 TikTok, $0.07 Meta, Metricool) are **global**
  averages. Spain Meta median: CPM ~€7.6, CPC ~€0.46 (all clicks), with CPM
  ranging €3.6–25.3 by month (Superads via georgegrowth.com).
- Meta reports link clicks, not visits; one 2026 case had only 40% landing page
  views. The landing-page-view goal needs a Meta pixel, which we don't have.
- TikTok minimum: $50/day per campaign and $20/day per ad group. Only
  weekend lifetime-budget flights or Spark Ads on organic winners fit.
- Push, popunder and native networks (MGID, PropellerAds) risk the **AdSense**
  account (the publisher is liable for invalid traffic). Avoid them.
- Google Ads "Insufficient original content" policy: land ads on rich
  listing pages, not thin event pages.
- Google has 93.8% of search in Spain, Bing 3.5% (StatCounter, Sep 2026).
- **Google Ad Grants**: up to $10K/month in free Search ads. Needs a registered
  nonprofit (associació), **no AdSense on the site**, 5% account CTR and
  conversion tracking.
- Generalitat grants: the structural grant for digital media in Catalan
  (Ordre PRE/79/2026) needs mostly signed journalism, 100% Catalan and staff,
  and excludes sites that mostly republish content, so we likely don't qualify.
  Política Lingüística "català en l'àmbit digital" (PLG002, companies allowed)
  closed 2026-04-28; watch for the next call.
- Survey (Enquesta de participació cultural de Catalunya 2025, n=5,039,
  weighted):
  - 30% of people aged 14+ looked up cultural information online in the last
    week; ages 45–64 did so most (34–36%).
  - Among people who didn't go to a concert or show, only 4–8% blame a lack
    of information. Lack of interest (36–40%) and lack of time (32–34%) are
    the main reasons. Target people who already go out.
  - 48% of internet users use Catalan online at all.

The site has no Meta or TikTok pixel. Adding one needs consent gating (Consent
Mode doesn't gate non-Google tags) and new CSP hosts in `utils/proxy-csp.ts`.

## 3. What to do, in order (free first)

Budget for now: **€0**. Paid ads wait until promoted/featured events earn
money (see step 6).

1. **Clean the measurement.**
   - Finish #663: internal IP filter, and a decision on the China bots.
   - Read GA4 with `country = Spain` (the weekly dashboard already does).
   - Take the baseline from 2026-11-06 on (after #680).
   - `begin_checkout` can't be marked as a key event yet: GA4 only lists events
     seen in the last 28 days and it has never fired (1 promote page view in
     12 months). Star it after the first real checkout. `purchase` already is
     a key event.
2. **Find out why town pages lost their ranking.** It's the largest traffic
   loss we can see. Compare a town page with femturisme.cat's page for the same
   town (content, events shown, internal links). Then test one change on a
   handful of towns and compare with untouched towns in Search Console after
   4–6 weeks. Options: lead the title with "Agenda {town}", add a short
   unique intro per town, show more local events.
3. **Weekend and comarca terms.** The pages exist; the gap is ranking for
   "agenda cap de setmana [comarca]" and "què fer aquest cap de setmana".
   Internal links from town pages to their comarca weekend page are free.
4. **Retention.** Only 10% of users return and push is mostly dismissed.
   Better push timing, a Telegram/WhatsApp channel or an install offer make
   every visitor worth more, paid or not.
5. **Free distribution.** Organic posts (Instagram, TikTok, Bluesky) with
   "this weekend in [comarca]"; the ones that do well become ad creatives later.
6. **Paid, later.** Start when promoted/featured events bring in money, using
   that money. Order: Google Ad Grants if the project becomes an associació
   (AdSense earns ~€6/month, so dropping it costs almost nothing), else the
   Google Search test in the appendix, then one Meta weekend test.

Skip: TikTok always-on, push/native networks (they risk the AdSense account),
Bing, paid AI creative tools.

## 4. Re-running the numbers

```bash
gcloud auth application-default login --scopes=openid,https://www.googleapis.com/auth/userinfo.email,https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/analytics.readonly,https://www.googleapis.com/auth/webmasters.readonly
python3 scripts/ga-dashboard.py --country Spain   # GA4 overview, quota project esdeveniments-3
python3 scripts/seo-audit.py --country Spain      # Search Console + GA4 audit
```

For the town-page trend, query Search Console `searchAnalytics/query` with
`dimensions: ["date"]` and a page filter
`includingRegex ^https://www\.esdeveniments\.cat/(es/|en/)?[a-z0-9-]+$`
(Search Console uses RE2: no lookahead). Ask for `date` only; `date` + `page`
hits the 25K row cap and undercounts.

Where older metrics live:

- Weekly GA4 dashboard: GitHub issues "📊 Weekly GA4 Dashboard" (open one is
  current; older ones are auto-closed), from `.github/workflows/ga-dashboard.yml`
  (`--country Spain`). #611 (2026-10-27 → 11-02): 553 users, 48% opened an
  event page, action rate 8.7%, search used by 1.1%.
- SEO audit issues (label `automated-audit`): #251, #261, #267, then #697
  (2026-11-07). The scheduled run failed from May to 2026-11-01 because it
  pushed its data to protected `develop`; #659 switched it to run artifacts.
- #663: pending analytics work.
- `docs/incidents/2026-08-18-zaraz-zone-wide-google-tags.md`: why GA4 numbers
  before 2026-08-17 are inflated.

Still unverified: Keyword Planner volumes (needs billing on the Ads account),
whether Meta offers Catalan as a target language, the Cloudflare Zaraz state,
the project's legal form, and why town pages lost ranking.

## 5. Free options by effort (checked 2026-11-07, see below)

Many of these may already be done or in progress. Check before starting
(see the follow-up prompt below).

Quick (hours):

1. Title test on ~10 town pages ("Agenda {town}: concerts, fires i festes"),
   with ~10 similar towns as the control; compare in Search Console after
   4–6 weeks.
2. Links from each town page to its comarca weekend page.
3. Fix the "10K+ monthly users" claim in the GitHub org README (real: ~1.5K).
4. GA4 internal-traffic filter (#663; needs the team's IPs).

Medium (days to weeks):

5. Richer town pages: a short unique intro per town, and nearby towns' events
   when a town has few.
6. Retention: a weekly "this weekend in your comarca" channel
   (Telegram/WhatsApp) and better push timing (10% return today).
7. One weekly social post per comarca (Instagram, TikTok, Bluesky).

Bigger:

8. Ask town councils (they rank first for their own towns) for a link or an
   embedded widget.
9. Google Ad Grants (needs an associació).

### Status (checked 2026-11-07)

- 1 and 5: started as the town-page test below.
- 2: done. Town pages link to their comarca weekend page
  (`ExploreNearby`).
- 3: dropped (no SEO effect).
- 4: open in #663, with the China-bot rule.
- 6 and 7: the social publisher already posts the weekly "Què fer el cap de
  setmana a …" news articles. Push by comarca needs a place on each
  subscription first.
- 8: tried by email, no replies.
- 9: blocked on the legal form.

### Town-page test (starts the day it reaches main; write the date here)

Town pages are not penalised: no manual action or security issue in Search
Console, and URL Inspection shows them indexed with our canonical. They lost
about 4 positions at each of the March and May 2026 core updates while event
pages held, which fits a quality re-rating of thin, templated pages. The
cause is not proven, so we test it.

30 towns with similar impressions (Mar–Jun 2026) were split at random in
blocks of three (`config/town-seo-test.ts`, ~3,900 impressions per group):

| Group | Change | Towns |
|---|---|---|
| A | Meta title "Agenda {town}: concerts, fires i festes" | tarragona, canet-de-mar, sant-pol-de-mar, vilanova-i-la-geltru, palamos, mataro, sant-quirze-del-valles, figueres, castellbisbal, llinars-del-valles |
| B | Short guide from the town's data (event count, main categories, comarca) and up to 8 comarca events when the town has 1–7 (`TownGuide`) | granollers, argentona, la-garriga, arenys-de-munt, vilassar-de-mar, tona, bigues-i-riells, calella, vallirana, alella |
| C | None (control) | el-masnou, altafulla, arenys-de-mar, cardedeu, malgrat-de-mar, caldes-de-montbui, igualada, badalona, montgat, roda-de-ter |

Measure per group (impressions, clicks, average position, all locales) for
the 6 weeks before the deploy and 4–6 weeks after, and again after the next
core update. Compare each group's change with C's. Keep other town-page
changes out until then, or apply them to all three groups. When it ends,
roll out the winner and delete `config/town-seo-test.ts`.

### Follow-up prompt

Paste this into a new session:

```text
Read docs/growth/paid-acquisition-research-2026-11.md (sections 1, 3 and 5).
With no assumptions, check each option in section 5 against what already
exists or is in progress: code on develop and main, open PRs and branches,
plans/, docs/, GitHub issues (#663 and others), and the live site. For each
option give HAVE / PARTIAL / MISSING / IN PROGRESS with proof (file:line, PR,
issue or URL). Then re-pull Search Console for the town pages (section 4 shows
how) to see whether the ranking drop is still going. Propose a short plan for
the MISSING and PARTIAL items only, ordered by impact per hour, free work only
(no ad spend). Wait for my OK before coding. Work in a separate worktree off
develop; don't touch my current branch.
```

## Appendix: Google Search test (ready, not launched)

Only when there's money for it (section 3, step 6). Nothing here has run.

- **Account**: Esdeveniments, 467-859-2752. Turn off Display and Search
  partners. Location: Catalonia, "presence" (people in the area).
  Languages: Catalan and Spanish.
- **Budget**: €100–150 over two weekends, Thursday–Sunday. Manual CPC with a
  cap; we have no Spanish CPC data for these terms, so set the cap after the
  first day's auction data.
- **Ad groups** (keywords from Search Console demand above, phrase match):

| Ad group | Keywords | Landing page |
|---|---|---|
| Cap de setmana | "què fer aquest cap de setmana", "on anar aquest cap de setmana", "agenda cap de setmana", "plans cap de setmana catalunya" | `/catalunya/cap-de-setmana` |
| Comarques | "agenda cap de setmana osona", "agenda vallès oriental", "què fer al maresme", "agenda maresme cap de setmana" | `/osona/cap-de-setmana`, `/valles-oriental/cap-de-setmana`, `/maresme/cap-de-setmana` |
| Avui | "què fer avui", "què fer avui a barcelona", "plans per avui catalunya" | `/catalunya/avui`, `/barcelona/avui` |
| Castellano | "qué hacer este fin de semana barcelona", "eventos barcelona hoy", "planes barcelona hoy" | `/es/barcelona/cap-de-setmana`, `/es/barcelona/avui` |

- **Negative keywords**: feina, treball, empleo, curs, cursos, entrades
  gratis, sorteig, hotel, restaurant, apartament.
- **Ads (Catalan, responsive search ad)**. Headlines (≤30 chars):
  "Què fer aquest cap de setmana", "Agenda d'avui a prop teu",
  "Concerts, fires i festes", "Plans gratis i per a famílies",
  "+900 pobles de Catalunya". Descriptions (≤90 chars):
  "Tots els plans del cap de setmana al teu poble i comarca. Gratis, sense registre."
  / "Concerts, teatre, mercats i activitats familiars, actualitzats cada dia."
- **Ads (Spanish)**: "Qué hacer este fin de semana", "Planes hoy en Barcelona",
  "Conciertos, ferias y fiestas"; "Todos los planes del fin de semana en tu
  ciudad. Gratis y sin registro."
- **Tracking**: auto-tagging on (gclid) plus
  `?utm_source=google&utm_medium=cpc&utm_campaign=weekend-test-YYYY-MM`.
  Checked 2026-11-07: these landing URLs return 200 with UTM and gclid kept
  (no redirect).
- **Success**: cost per engaged session (GA4, Spain, `utm_campaign`) and the
  share who return within 30 days. **Stop rule**: under 5% return → fix
  retention before spending more.
