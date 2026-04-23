Analyze the latest SEO audit issue in Esdeveniments/esdeveniments-frontend and post one actionable comment.

IDEMPOTENCY MARKER: <!-- claude-seo-analysis -->
If any comment on the target issue already contains that marker, EXIT immediately.

STEP 1 — Fetch latest SEO audit:
  gh issue list --repo Esdeveniments/esdeveniments-frontend \
    --label seo --label automated-audit --state open \
    --json number,createdAt,body,comments --limit 1
Exit silently if: none found, OR createdAt is older than 3 days, OR any existing comment
contains the marker.

STEP 2 — Parse from the issue body:
- 'Quick Wins' table (high impressions, low CTR)
- 'Striking Distance' table (position 5-20)
- 'Cannibalization' blocks (multiple pages for same query)
- 'Core Web Vitals' section (if present)

STEP 3 — Cannibalization analysis (highest priority):
For each pair, locate the source generating each URL by inspecting:
- next.config.js (redirects, rewrites)
- next-sitemap.config.*
- app/ or pages/ routing directories
Propose ONE of: canonical tag, 301 redirect, or merge. Must cite file:line (Read the file first).

STEP 4 — Striking distance analysis:
FILTER: only queries with impressions >100.
For each surviving query:
- Locate the target page source in the repo.
- Read <title>, <h1>, meta description for the exact query terms.
- If any term is missing, flag with file:line of where to add it.
- If all terms present, DROP the query from output (no false alarm).

STEP 5 — Quick wins analysis:
For each high-impression-low-CTR page, propose a rewritten <title> + meta description that
includes the top-impression query. Show current vs proposed side by side.
DO NOT propose a rewrite if the target query already appears in the current <title>.

STEP 6 — Core Web Vitals (if section present):
If a CWV row is marked SLOW or AVERAGE, locate the likely bottleneck in the repo (hydration,
font loading, image optimization, CSP). Propose one concrete fix (file:line). If all rows are
FAST, skip this section.

STEP 7 — Analysis rules (prevent LLM slop):
- File:line gate: never cite file:line without reading the file first.
- Brand-voice gate: proposed titles must stay in Catalan/Spanish consistent with existing pages.
- Pad gate: fewer meaningful suggestions is better than padding.

STEP 8 — Build comment body. Structure:

<!-- claude-seo-analysis -->

## Cannibalization (ranked by impressions lost)
[list with file:line fixes]

## Striking distance gaps
[only queries with impr>100 AND missing terms]

## Quick win rewrites
[current → proposed, per page]

## CWV (only if SLOW/AVERAGE rows exist)
[file:line fix proposals]

Each suggestion labeled with:
- **Expected impact:** quantified OR "unknown"
- **Measurement:** GSC query/page to monitor
- **Confidence:** measured | hypothesis | guess

## Permission to say nothing
If no cannibalization pairs, no striking distance gaps (impr>100), no quick wins with missing
query terms, and no CWV regressions, skip the sections above and post ONLY:

<!-- claude-seo-analysis -->
No material actions this audit. KPIs: [one-line summary of GSC/GA4 deltas from the audit's KPI
Summary table].

STEP 9 — Post:
  gh issue comment <N> --repo Esdeveniments/esdeveniments-frontend --body-file -
First line of body MUST be the marker. Under 700 words. Order: cannibalization → striking
distance → quick wins → CWV.
