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

Each JSON contains: KPIs, quick wins, striking distance queries, cannibalization, content gaps, trends, traffic sources, custom events, and device breakdowns.
