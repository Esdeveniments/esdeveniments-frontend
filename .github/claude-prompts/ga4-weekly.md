Analyze the latest weekly GA4 dashboard issue in Esdeveniments/esdeveniments-frontend and post one actionable comment.

IDEMPOTENCY MARKER: <!-- claude-ga4-analysis -->
If any comment on the target issue already contains that marker, EXIT immediately.

STEP 1 — Fetch latest GA4 issue (within last 8 days):
  gh issue list --repo Esdeveniments/esdeveniments-frontend \
    --label analytics --label automated-dashboard --state open \
    --search "created:>$(date -u -d '8 days ago' +%Y-%m-%d)" \
    --json number,body,comments --limit 1
If none, exit silently. If any existing comment contains the marker above, exit silently.

STEP 2 — Fetch previous week's GA4 issue for comparison:
  gh issue list --repo Esdeveniments/esdeveniments-frontend \
    --label analytics --label automated-dashboard --state all \
    --json number,body --limit 2
Second item is last week. Parse both "Health Check" and "Feature Adoption" tables.

STEP 3 — Identify code that actually changed in the last 14 days (for causation claims):
  git log --since='14 days ago' --name-only --pretty=format: | sort -u > /tmp/changed.txt

STEP 4 — Analysis rules (IMPORTANT — these prevent LLM slop):
- Read the "## Context" block at the top of the issue body if present. It lists holiday overlaps
  and expected seasonal effects. Factor those in — DO NOT re-derive seasonality from general
  knowledge.
- Statistical gate: if an absolute event count is <10, or a metric row is labeled "low-n" or
  shown with ⚪ status, label it "low-n, directional only" and DO NOT propose a code fix for it.
- Causation gate: when attributing a regression to a code path, check /tmp/changed.txt. If the
  file did NOT change in the last 14 days, say "code unchanged — investigate tracking or
  upstream cause" rather than blaming the code.
- File:line gate: never reference a file:line without reading the file first. No guesses.
- Pad gate: if you have fewer than 3 meaningful suggestions, give fewer. Do not pad.

STEP 5 — Build comment body. Structure:

<!-- claude-ga4-analysis -->

## Regressions (>15% drop vs last week)
For each: metric, absolute counts this week vs last, likely cause (code changed? vs code
unchanged? vs holiday effect from the Context block?), n-gate label if applicable.

## Suggestions (ranked by expected impact, max 3)
For each:
- **Action:** file:line change, concrete
- **Expected impact:** quantified estimate OR "unknown — needs A/B"
- **Measurement:** exact GA4 event name to watch after shipping
- **Confidence:** measured | hypothesis | guess

## Permission to say nothing
If no metric crossed 15% regression threshold AND no adoption rate is below 5% AND no Pareto
pattern stands out AND the Context block explains any deltas, skip sections above and post ONLY:

<!-- claude-ga4-analysis -->
No material change this week. Action rate stable at X% (vs Y% last week). Nothing to ship.

STEP 6 — Post as a single comment on the source issue:
  gh issue comment <N> --repo Esdeveniments/esdeveniments-frontend --body-file -
First line of body MUST be the marker. Under 500 words. No recap of bot-generated content.
