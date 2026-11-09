# SEO Audit Data

Historical SEO audit data from the automated bi-weekly workflow (`.github/workflows/seo-audit.yml`).

## Files

- `YYYY-MM-DD.json` — Structured audit data (GSC + GA4 metrics)
- `YYYY-MM-DD.md` — Human-readable report (also posted as GitHub Issue)

## Usage

Compare any two audits:
```bash
python scripts/seo-audit.py --previous data/seo-audits/2026-03-01.json
```

Each JSON contains: KPIs, quick wins, striking distance queries, cannibalization, content gaps, dead pages, keywords per town (`gsc.town_keywords`: the top non-brand queries of each place's listing pages), trends, traffic sources, custom events, and device breakdowns.

Each run also uploads the JSON unzipped as the artifact `seo-audit.json`, and the weekly GA4 dashboard uploads `ga-dashboard.json`. The admin dashboard (`Esdeveniments/esdeveniments-dashboard`) reads the latest `seo-audit.json`.
