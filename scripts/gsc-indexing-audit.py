#!/usr/bin/env python3
"""
GSC indexing-problem audit.

Pulls signals the GSC UI surfaces but the API exposes only partially:
- Sitemap submission/indexing stats per chunk
- URL Inspection on a sample of representative URLs
- Search performance grouped by URL pattern, current vs prior 28d
- Pages with sharp impression drops (proxy for newly de-indexed URLs)

Auth: ADC. Set up via `gcloud auth application-default login --scopes=...webmasters.readonly`.
"""
import sys
import re
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone

import google.auth
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

SITE = "sc-domain:esdeveniments.cat"
QUOTA_PROJECT = "esdeveniments-3"

TODAY = datetime.now(timezone.utc)
END = (TODAY - timedelta(days=3)).strftime("%Y-%m-%d")
START_28 = (TODAY - timedelta(days=31)).strftime("%Y-%m-%d")
END_PREV = (TODAY - timedelta(days=32)).strftime("%Y-%m-%d")
START_PREV = (TODAY - timedelta(days=60)).strftime("%Y-%m-%d")


def authed():
    creds, _ = google.auth.default(
        scopes=["https://www.googleapis.com/auth/webmasters.readonly"],
        quota_project_id=QUOTA_PROJECT,
    )
    return build("searchconsole", "v1", credentials=creds, cache_discovery=False)


def classify(url: str) -> str:
    """Bucket a URL by structural pattern."""
    try:
        path = url.split("://", 1)[1].split("/", 1)[1]
    except IndexError:
        return "homepage"
    # strip locale prefix (ca | es | en)
    if re.match(r"^(ca|es|en)(/|$)", path):
        path = path.split("/", 1)[1] if "/" in path else ""
    if not path or path == "":
        return "homepage"
    segs = [s for s in path.split("/") if s]
    if not segs:
        return "homepage"
    first = segs[0]
    if first == "e":
        return "event-detail"
    if first == "noticies":
        return f"news-{'detail' if len(segs) > 1 else 'list'}"
    if first in (
        "sitemap",
        "api",
        "patrocina",
        "qui-som",
        "preferits",
        "publica",
        "termes-servei",
        "politica-privacitat",
        "callback",
        "compartir-tiktok",
        "ask",
        "agent-view",
        "docs",
        "mcp",
        "openapi",
    ):
        return f"static-{first}"
    # /[place] or /[place]/[byDate] or /[place]/[byDate]/[category]
    n = len(segs)
    if n == 1:
        return "place"
    if n == 2:
        return "place+filter"  # date OR category
    if n == 3:
        return "place+date+category"
    return "other"


def sitemap_stats(gsc):
    print("\n=== SITEMAPS ===")
    res = gsc.sitemaps().list(siteUrl=SITE).execute()
    rows = []
    for sm in res.get("sitemap", []):
        path = sm.get("path", "")
        contents = sm.get("contents", [])
        web = next((c for c in contents if c.get("type") == "web"), {})
        rows.append(
            {
                "path": path,
                "submitted": int(web.get("submitted") or 0),
                "indexed": int(web.get("indexed") or 0),
                "warnings": int(sm.get("warnings") or 0),
                "errors": int(sm.get("errors") or 0),
                "lastDownloaded": sm.get("lastDownloaded", ""),
                "isPending": sm.get("isPending", False),
            }
        )
    rows.sort(key=lambda r: r["path"])
    print(
        f"{'path':<70} {'submitted':>10} {'indexed':>9} {'ratio':>7} {'warn':>5} {'err':>4}"
    )
    total_sub = total_idx = 0
    for r in rows:
        ratio = (r["indexed"] / r["submitted"] * 100) if r["submitted"] else 0
        print(
            f"{r['path']:<70} {r['submitted']:>10,} {r['indexed']:>9,} {ratio:>6.1f}% {r['warnings']:>5} {r['errors']:>4}"
        )
        total_sub += r["submitted"]
        total_idx += r["indexed"]
    if total_sub:
        ratio = total_idx / total_sub * 100
        print(
            f"{'TOTAL':<70} {total_sub:>10,} {total_idx:>9,} {ratio:>6.1f}%"
        )
    return rows


def gsc_pages(gsc, start, end, limit=1_000_000):
    """All pages with impressions in window. Limit is a safety cap (raised
    well above the previous 25k single-page cap so audits don't silently
    truncate on larger properties)."""
    out, start_row = [], 0
    while True:
        body = {
            "startDate": start,
            "endDate": end,
            "dimensions": ["page"],
            "rowLimit": 25000,
            "startRow": start_row,
        }
        try:
            res = gsc.searchanalytics().query(siteUrl=SITE, body=body).execute()
        except HttpError as e:
            print(f"GSC error: {e}", file=sys.stderr)
            break
        rows = res.get("rows", [])
        out.extend(rows)
        if len(rows) < 25000 or len(out) >= limit:
            break
        start_row += 25000
    return out


def pattern_aggregation(gsc):
    print("\n=== PERFORMANCE BY URL PATTERN (current 28d vs prior 28d) ===")
    print(f"Current:  {START_28} → {END}")
    print(f"Previous: {START_PREV} → {END_PREV}")

    cur = gsc_pages(gsc, START_28, END)
    prev = gsc_pages(gsc, START_PREV, END_PREV)
    print(f"Fetched: current {len(cur):,} pages, previous {len(prev):,} pages")

    def agg(rows):
        d = defaultdict(lambda: {"pages": 0, "clicks": 0, "impr": 0})
        for r in rows:
            url = r["keys"][0]
            b = classify(url)
            d[b]["pages"] += 1
            d[b]["clicks"] += r.get("clicks", 0)
            d[b]["impr"] += r.get("impressions", 0)
        return d

    cur_agg = agg(cur)
    prev_agg = agg(prev)
    buckets = sorted(set(cur_agg) | set(prev_agg))

    print(
        f"\n{'bucket':<26} {'pages':>7} {'pgΔ':>6} {'clicks':>8} {'clkΔ%':>7} {'impr':>10} {'imprΔ%':>8}"
    )
    for b in buckets:
        c = cur_agg[b]
        p = prev_agg[b]
        pg_d = c["pages"] - p["pages"]
        clk_d = (
            ((c["clicks"] - p["clicks"]) / p["clicks"] * 100) if p["clicks"] else 0
        )
        imp_d = (
            ((c["impr"] - p["impr"]) / p["impr"] * 100) if p["impr"] else 0
        )
        print(
            f"{b:<26} {c['pages']:>7,} {pg_d:>+6,} {c['clicks']:>8,} {clk_d:>+6.1f}% {c['impr']:>10,} {imp_d:>+7.1f}%"
        )
    return cur, prev, cur_agg, prev_agg


def big_droppers(cur_rows, prev_rows, limit=15):
    """Pages with massive impression drops — proxy for de-indexed URLs."""
    cur_map = {r["keys"][0]: r for r in cur_rows}
    prev_map = {r["keys"][0]: r for r in prev_rows}

    drops = []
    for url, p in prev_map.items():
        c = cur_map.get(url, {})
        prev_imp = p.get("impressions", 0)
        cur_imp = c.get("impressions", 0)
        if prev_imp < 50:
            continue
        delta = cur_imp - prev_imp
        if delta <= -prev_imp * 0.7:  # lost ≥70% impressions (exact 70% included)
            drops.append((url, prev_imp, cur_imp, delta))
    drops.sort(key=lambda x: x[3])  # biggest absolute drop first

    print(f"\n=== TOP {limit} URLS BY IMPRESSION DROP (prev imp ≥ 50, -70%+) ===")
    print(f"{'url':<80} {'prev':>8} {'cur':>6} {'Δ':>7}  bucket")
    for url, prev_imp, cur_imp, delta in drops[:limit]:
        bucket = classify(url)
        print(f"{url[:80]:<80} {prev_imp:>8,} {cur_imp:>6,} {delta:>+7,}  {bucket}")
    return drops


def inspect_sample(gsc, urls, max_per_bucket=2):
    """URL Inspection API — slow (2k/day quota). Sample per bucket."""
    print(f"\n=== URL INSPECTION (sample per bucket, may take time) ===")
    by_bucket = defaultdict(list)
    for u in urls:
        by_bucket[classify(u)].append(u)
    sample = []
    for bucket, lst in by_bucket.items():
        sample.extend([(bucket, u) for u in lst[:max_per_bucket]])

    print(f"Inspecting {len(sample)} URLs...\n")
    for bucket, url in sample:
        try:
            res = (
                gsc.urlInspection()
                .index()
                .inspect(body={"inspectionUrl": url, "siteUrl": SITE})
                .execute()
            )
            idx = res.get("inspectionResult", {}).get("indexStatusResult", {})
            verdict = idx.get("verdict", "?")
            coverage = idx.get("coverageState", "?")
            indexing = idx.get("indexingState", "?")
            robots = idx.get("robotsTxtState", "?")
            crawled_as = idx.get("crawledAs", "?")
            last_crawl = idx.get("lastCrawlTime", "")[:10]
            print(f"[{bucket}] {url}")
            print(
                f"   verdict={verdict}  coverage={coverage}  indexing={indexing}"
            )
            print(
                f"   robots={robots}  crawledAs={crawled_as}  lastCrawl={last_crawl}"
            )
            user_canonical = idx.get("userCanonical", "")
            google_canonical = idx.get("googleCanonical", "")
            if user_canonical and google_canonical and user_canonical != google_canonical:
                print(
                    f"   ⚠ canonical mismatch:\n"
                    f"      user:   {user_canonical}\n"
                    f"      google: {google_canonical}"
                )
            time.sleep(1)  # be gentle with quota
        except HttpError as e:
            print(f"[{bucket}] {url}  → ERROR: {e}")


def main():
    gsc = authed()

    sitemap_stats(gsc)
    cur, prev, cur_agg, prev_agg = pattern_aggregation(gsc)
    drops = big_droppers(cur, prev)

    # Pick representative URLs to inspect: 1 from each bucket of interest
    bucket_samples = defaultdict(list)
    for r in cur:
        url = r["keys"][0]
        bucket_samples[classify(url)].append(url)

    # Pick: 1 homepage, 1 place, 2 place+filter (most affected), 2 place+date+category
    sample = []
    for b in ("homepage", "place", "place+filter", "place+date+category", "event-detail"):
        sample.extend(bucket_samples.get(b, [])[:2])

    if sample:
        inspect_sample(gsc, sample, max_per_bucket=2)


if __name__ == "__main__":
    main()
