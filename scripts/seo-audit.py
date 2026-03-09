#!/usr/bin/env python3
"""
Automated SEO audit: Google Search Console + Google Analytics 4.

Outputs structured JSON for trend comparison and Markdown for GitHub Issues.
Designed to run in GitHub Actions with a GCP service account.

Usage:
  python scripts/seo-audit.py [--previous path/to/previous.json]

Environment:
  GOOGLE_APPLICATION_CREDENTIALS - path to GCP service account key JSON
  GSC_SITE_URL                   - Search Console property (default: https://www.esdeveniments.cat/)
  GA4_PROPERTY_ID                - GA4 property ID (default: 406884331)
  SEO_AUDIT_OUTPUT_DIR           - output directory (default: current dir)
"""

import json
import os
import re
import argparse
from datetime import datetime, timedelta
from collections import defaultdict

import google.auth
import requests
from googleapiclient.discovery import build
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    RunReportRequest, DateRange, Dimension, Metric, OrderBy,
    FilterExpression, Filter,
)

# ─── CONFIGURATION ───
SITE = os.environ.get("GSC_SITE_URL", "https://www.esdeveniments.cat/")
GA_PROPERTY = f"properties/{os.environ.get('GA4_PROPERTY_ID', '406884331')}"
OUTPUT_DIR = os.environ.get("SEO_AUDIT_OUTPUT_DIR", ".")
BRAND_TERM = os.environ.get("SEO_BRAND_TERM", "esdeveniment")

# Detection thresholds
QUICK_WIN_MIN_IMPRESSIONS = 100
QUICK_WIN_MAX_CTR = 0.03
STRIKING_MIN_POS = 5
STRIKING_MAX_POS = 20
STRIKING_MIN_IMPRESSIONS = 10
HIGH_BOUNCE_MIN_SESSIONS = 20
HIGH_BOUNCE_THRESHOLD = 0.7
BOUNCE_DIVERGENCE_THRESHOLD = 0.15
LOW_USAGE_THRESHOLD = 50

# Custom GA4 events to track
TRACKED_CUSTOM_EVENTS = [
    "filter_change", "search", "share", "add_to_calendar", "load_more",
    "outbound_click", "view_event_page", "hero_cta_click", "sponsor_click",
    "select_category", "home_chip_click", "ai_referrer",
]

# AI referrer platforms (shared between traffic computation and breakdown)
AI_PLATFORMS = ["chatgpt", "perplexity", "copilot", "gemini", "claude", "bing.com/chat"]

# Expired event date pattern (Catalan date format in URLs)
EXPIRED_EVENT_DATE_RE = re.compile(r"(\d{1,2})-de-(\w+)-del-(\d{4})")
CATALAN_MONTHS = {
    "gener": 1, "febrer": 2, "marc": 3, "abril": 4, "maig": 5, "juny": 6,
    "juliol": 7, "agost": 8, "setembre": 9, "octubre": 10, "novembre": 11, "desembre": 12,
}

# 3-segment URL path prefixes to exclude from indexing checks
THREE_SEGMENT_EXCLUDE = ("e", "noticies", "api", "sitemap-places")

# Features to check for low engagement
LOW_USAGE_FEATURES = ["share", "add_to_calendar"]

# Core Web Vitals thresholds: (good_max, poor_min, unit)
CWV_THRESHOLDS = {
    "LCP": (2500, 4000, "ms"), "CLS": (0.1, 0.25, ""), "INP": (200, 500, "ms"),
    "FCP": (1800, 3000, "ms"), "TTFB": (800, 1800, "ms"),
}

# i18n locale prefixes for URL parsing
I18N_EVENT_PREFIXES = [("/es/e/", "es"), ("/en/e/", "en"), ("/e/", "ca")]
LOCALE_PATH_PREFIXES = ["/es/", "/en/"]

TODAY = datetime.now()
END = (TODAY - timedelta(days=3)).strftime("%Y-%m-%d")
START_90 = (TODAY - timedelta(days=93)).strftime("%Y-%m-%d")
START_30 = (TODAY - timedelta(days=33)).strftime("%Y-%m-%d")
END_PREV = (TODAY - timedelta(days=34)).strftime("%Y-%m-%d")
START_PREV = (TODAY - timedelta(days=63)).strftime("%Y-%m-%d")

# ─── AUTH ───
try:
    credentials, project = google.auth.default(
        scopes=[
            "https://www.googleapis.com/auth/webmasters.readonly",
            "https://www.googleapis.com/auth/analytics.readonly",
        ]
    )
    gsc = build("searchconsole", "v1", credentials=credentials)
    ga = BetaAnalyticsDataClient(credentials=credentials)
except Exception as e:
    print(f"❌ Authentication failed: {e}")
    print("Set GOOGLE_APPLICATION_CREDENTIALS or configure ADC.")
    raise SystemExit(1)


# ─── HELPERS ───
def gsc_query(dims, start, end, limit=500, filters=None):
    body = {"startDate": start, "endDate": end, "dimensions": dims, "rowLimit": limit}
    if filters:
        body["dimensionFilterGroups"] = [{"filters": filters}]
    try:
        return gsc.searchanalytics().query(siteUrl=SITE, body=body).execute().get("rows", [])
    except Exception as e:
        print(f"⚠️ GSC query failed (dims={dims}): {e}")
        return []


def ga_report(dimensions, metrics, start=START_90, end=END, limit=25, dim_filter=None):
    req = RunReportRequest(
        property=GA_PROPERTY,
        date_ranges=[DateRange(start_date=start, end_date=end)],
        dimensions=[Dimension(name=d) for d in dimensions],
        metrics=[Metric(name=m) for m in metrics],
        order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name=metrics[0]), desc=True)],
        limit=limit,
    )
    if dim_filter:
        req.dimension_filter = dim_filter
    try:
        resp = ga.run_report(req)
    except Exception as e:
        print(f"⚠️ GA4 report failed (dims={dimensions}): {e}")
        return []
    return [
        {
            "dims": [v.value for v in row.dimension_values],
            "metrics": [v.value for v in row.metric_values],
        }
        for row in resp.rows
    ]


def safe_float(val, default=0.0):
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def safe_int(val, default=0):
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


def fetch_psi_data(url, strategy="MOBILE"):
    """Fetch CWV from PageSpeed Insights API (free, no auth needed with API key)."""
    api_key = os.environ.get("PSI_API_KEY", "")
    params = {"url": url, "category": "PERFORMANCE", "strategy": strategy}
    if api_key:
        params["key"] = api_key
    try:
        resp = requests.get(
            "https://www.googleapis.com/pagespeedonline/v5/runPagespeed",
            params=params,
            timeout=60,
        )
        if resp.status_code == 200:
            return resp.json()
        print(f"⚠️ PSI API returned {resp.status_code} for {strategy}")
    except requests.exceptions.Timeout:
        print(f"⚠️ PSI API timed out for {strategy}")
    except Exception as e:
        print(f"⚠️ PSI API error for {strategy}: {e}")
    return None


def parse_psi_cwv(psi_data):
    """Extract CWV metrics from PSI response (CrUX field data + Lighthouse score)."""
    if not psi_data:
        return None
    result = {}
    # CrUX field data (real user metrics)
    crux = psi_data.get("loadingExperience", {}).get("metrics", {})
    metric_map = {
        "LARGEST_CONTENTFUL_PAINT_MS": "LCP",
        "CUMULATIVE_LAYOUT_SHIFT_SCORE": "CLS",
        "INTERACTION_TO_NEXT_PAINT": "INP",
        "FIRST_CONTENTFUL_PAINT_MS": "FCP",
        "EXPERIMENTAL_TIME_TO_FIRST_BYTE": "TTFB",
    }
    for key, label in metric_map.items():
        m = crux.get(key, {})
        p75 = m.get("percentile")
        if p75 is not None:
            p75 = float(p75)
            # PSI returns CLS percentile as integer (12 = 0.12 CLS)
            result[label] = p75 / 100 if label == "CLS" else p75
        cat = m.get("category")
        if cat:
            result[f"{label}_category"] = cat  # FAST / AVERAGE / SLOW
    # Lighthouse performance score (0-1)
    lh = psi_data.get("lighthouseResult", {}).get("categories", {}).get("performance", {})
    score = lh.get("score")
    if score is not None:
        result["lighthouse_score"] = round(score * 100)
    return result if result else None


def collect_cwv_data():
    """Collect Core Web Vitals via PageSpeed Insights API."""
    print("🔬 Collecting Core Web Vitals (PageSpeed Insights)...")
    data = {}
    for strategy, label in [("MOBILE", "mobile"), ("DESKTOP", "desktop")]:
        psi = fetch_psi_data(SITE, strategy)
        parsed = parse_psi_cwv(psi)
        if parsed:
            data[label] = parsed
    # Compute overall as mobile (Google uses mobile-first indexing)
    if "mobile" in data:
        data["overall"] = data["mobile"]
    return data


# ═══════════════════════════════════════════════════════════════
# DATA COLLECTION
# ═══════════════════════════════════════════════════════════════

def collect_gsc_data():
    """Collect all Google Search Console metrics."""
    print("📊 Collecting GSC data...")
    data = {}

    # Overall KPIs
    overall = gsc_query([], START_90, END)
    if overall:
        r = overall[0]
        data["kpis"] = {
            "clicks": r["clicks"],
            "impressions": r["impressions"],
            "ctr": round(r["ctr"], 4),
            "position": round(r["position"], 1),
        }
    else:
        data["kpis"] = {"clicks": 0, "impressions": 0, "ctr": 0, "position": 0}

    # Quick wins: high impressions, low CTR
    rows = gsc_query(["page"], START_90, END, limit=200)
    data["quick_wins"] = sorted(
        [
            {
                "page": r["keys"][0],
                "clicks": r["clicks"],
                "impressions": r["impressions"],
                "ctr": round(r["ctr"], 4),
                "position": round(r["position"], 1),
            }
            for r in rows
            if r["impressions"] >= QUICK_WIN_MIN_IMPRESSIONS and r["ctr"] < QUICK_WIN_MAX_CTR
        ],
        key=lambda r: r["impressions"],
        reverse=True,
    )[:25]

    # Striking distance: position 5-20
    rows = gsc_query(["query", "page"], START_90, END, limit=500)
    data["striking_distance"] = sorted(
        [
            {
                "query": r["keys"][0],
                "page": r["keys"][1],
                "clicks": r["clicks"],
                "impressions": r["impressions"],
                "ctr": round(r["ctr"], 4),
                "position": round(r["position"], 1),
            }
            for r in rows
            if STRIKING_MIN_POS <= r["position"] <= STRIKING_MAX_POS and r["impressions"] >= STRIKING_MIN_IMPRESSIONS
        ],
        key=lambda r: r["impressions"],
        reverse=True,
    )[:30]

    # Cannibalization: queries ranking on 2+ pages
    q_pages = defaultdict(list)
    for r in rows:
        q_pages[r["keys"][0]].append(
            {
                "page": r["keys"][1],
                "position": round(r["position"], 1),
                "clicks": r["clicks"],
                "impressions": r["impressions"],
            }
        )
    cannibal = {q: p for q, p in q_pages.items() if len(p) >= 2}
    data["cannibalization"] = sorted(
        [
            {"query": q, "total_impressions": sum(p["impressions"] for p in pages), "pages": pages}
            for q, pages in cannibal.items()
        ],
        key=lambda x: x["total_impressions"],
        reverse=True,
    )[:20]

    # Content gaps: impressions but 0 clicks at position 20+
    gaps_rows = gsc_query(["query"], START_90, END, 500)
    data["content_gaps"] = sorted(
        [
            {
                "query": r["keys"][0],
                "impressions": r["impressions"],
                "position": round(r["position"], 1),
            }
            for r in gaps_rows
            if r["clicks"] == 0 and r["position"] >= 20 and r["impressions"] >= 5
        ],
        key=lambda r: r["impressions"],
        reverse=True,
    )[:30]

    # Top performers: best CTR (min 50 impressions)
    perf_rows = gsc_query(["page"], START_90, END, 200)
    data["top_performers"] = sorted(
        [
            {
                "page": r["keys"][0],
                "clicks": r["clicks"],
                "impressions": r["impressions"],
                "ctr": round(r["ctr"], 4),
                "position": round(r["position"], 1),
            }
            for r in perf_rows
            if r["impressions"] >= 50
        ],
        key=lambda r: r["ctr"],
        reverse=True,
    )[:20]

    # Device breakdown
    data["devices"] = {}
    for device in ["MOBILE", "DESKTOP"]:
        dev_rows = gsc_query(
            ["page"], START_90, END, 10,
            filters=[{"dimension": "device", "operator": "equals", "expression": device}],
        )
        data["devices"][device.lower()] = [
            {
                "page": r["keys"][0],
                "clicks": r["clicks"],
                "ctr": round(r["ctr"], 4),
                "position": round(r["position"], 1),
            }
            for r in dev_rows
        ]

    # Trends: last 30d vs previous 30d
    recent = {r["keys"][0]: r for r in gsc_query(["query"], START_30, END, 200)}
    previous = {r["keys"][0]: r for r in gsc_query(["query"], START_PREV, END_PREV, 200)}
    trends = []
    for q in set(recent) | set(previous):
        r = recent.get(q, {"clicks": 0, "impressions": 0})
        p = previous.get(q, {"clicks": 0, "impressions": 0})
        trends.append({
            "query": q,
            "clicks_now": r["clicks"],
            "clicks_prev": p["clicks"],
            "impressions_now": r["impressions"],
            "impressions_prev": p["impressions"],
            "impressions_delta": r["impressions"] - p["impressions"],
        })
    data["trends"] = {
        "rising": sorted(trends, key=lambda x: x["impressions_delta"], reverse=True)[:15],
        "declining": sorted(trends, key=lambda x: x["impressions_delta"])[:15],
    }

    # Search appearance (rich results)
    sa_rows = gsc_query(["searchAppearance"], START_90, END)
    data["search_appearance"] = [
        {
            "type": r["keys"][0],
            "clicks": r["clicks"],
            "impressions": r["impressions"],
            "ctr": round(r["ctr"], 4),
        }
        for r in sa_rows
    ]

    # ── ENHANCED DETECTIONS ──

    # i18n cannibalization: same slug appearing under /e/, /es/e/, /en/e/
    i18n_cannibal = defaultdict(list)
    all_pages_rows = gsc_query(["page"], START_90, END, limit=500)
    for r in all_pages_rows:
        url = r["keys"][0]
        for prefix, locale in I18N_EVENT_PREFIXES:
            if prefix in url:
                slug = url.split(prefix)[-1].rstrip("/")
                i18n_cannibal[slug].append({
                    "locale": locale,
                    "page": url,
                    "clicks": r["clicks"],
                    "impressions": r["impressions"],
                    "ctr": round(r["ctr"], 4),
                    "position": round(r["position"], 1),
                })
                break
    # Only flag when genuinely different locales compete (not same locale dupes)
    data["i18n_cannibalization"] = sorted(
        [
            {"slug": slug, "total_impressions": sum(p["impressions"] for p in pages), "pages": pages}
            for slug, pages in i18n_cannibal.items()
            if len(set(p["locale"] for p in pages)) >= 2
        ],
        key=lambda x: x["total_impressions"],
        reverse=True,
    )[:15]

    # 3-segment URLs indexed (should not be): /place/date/category
    # Must have exactly 3 path segments after optional locale prefix
    # e.g., /catalunya/cap-de-setmana/fires-i-mercats or /es/tarragona/avui/familia
    data["three_segment_indexed"] = []
    for r in all_pages_rows:
        url = r["keys"][0]
        # Parse path, strip site URL and locale prefix
        path = url.replace(SITE, "/").rstrip("/")
        # Remove locale prefix if present
        for lp in LOCALE_PATH_PREFIXES:
            if path.startswith(lp):
                path = "/" + path[len(lp):]
                break
        segments = [s for s in path.split("/") if s]
        # 3 segments = place/date/category (exclude /e/ event detail, /noticies/, /api/, /sitemap)
        if len(segments) == 3 and segments[0] not in THREE_SEGMENT_EXCLUDE:
            data["three_segment_indexed"].append({
                "page": r["keys"][0],
                "clicks": r["clicks"],
                "impressions": r["impressions"],
                "position": round(r["position"], 1),
            })
    data["three_segment_indexed"] = sorted(
        data["three_segment_indexed"],
        key=lambda r: r["impressions"],
        reverse=True,
    )[:20]

    # Dead pages: high impressions, 0 clicks (wasted crawl budget)
    data["dead_pages"] = sorted(
        [
            {
                "page": r["keys"][0],
                "impressions": r["impressions"],
                "position": round(r["position"], 1),
            }
            for r in all_pages_rows
            if r["clicks"] == 0 and r["impressions"] >= 20
        ],
        key=lambda r: r["impressions"],
        reverse=True,
    )[:15]

    # AI Overview zero-click: queries at position 1-3 with 0 clicks
    # High position + 0 clicks strongly suggests AI Overview is answering the query
    query_rows = gsc_query(["query"], START_90, END, limit=500)
    data["ai_overview_suspects"] = sorted(
        [
            {
                "query": r["keys"][0],
                "impressions": r["impressions"],
                "position": round(r["position"], 1),
                "ctr": round(r["ctr"], 4),
            }
            for r in query_rows
            if r["position"] <= 3 and r["clicks"] == 0 and r["impressions"] >= 10
        ],
        key=lambda r: r["impressions"],
        reverse=True,
    )[:15]

    # Expired/past events still indexed (event URLs with dates in the past)
    expired_events = []
    for r in all_pages_rows:
        url = r["keys"][0]
        if "/e/" not in url:
            continue
        match = EXPIRED_EVENT_DATE_RE.search(url)
        if match:
            day, month_name, year = match.groups()
            month_num = CATALAN_MONTHS.get(month_name)
            if month_num:
                try:
                    event_date = datetime(int(year), month_num, int(day))
                    if event_date < TODAY - timedelta(days=30):
                        expired_events.append({
                            "page": url,
                            "event_date": event_date.strftime("%Y-%m-%d"),
                            "impressions": r["impressions"],
                            "clicks": r["clicks"],
                            "position": round(r["position"], 1),
                        })
                except ValueError:
                    pass
    data["expired_events_indexed"] = sorted(
        expired_events,
        key=lambda r: r["impressions"],
        reverse=True,
    )[:15]

    return data


def collect_ga4_data():
    """Collect all Google Analytics 4 metrics."""
    print("📈 Collecting GA4 data...")
    data = {}

    # Top pages
    data["top_pages"] = [
        {
            "page": r["dims"][0],
            "sessions": safe_int(r["metrics"][0]),
            "engaged": safe_int(r["metrics"][1]),
            "bounce_rate": round(safe_float(r["metrics"][2]), 3),
            "duration": round(safe_float(r["metrics"][3]), 1),
        }
        for r in ga_report(
            ["pagePath"],
            ["sessions", "engagedSessions", "bounceRate", "averageSessionDuration"],
            limit=30,
        )
    ]

    # Traffic sources
    data["traffic_sources"] = [
        {
            "source": r["dims"][0],
            "medium": r["dims"][1],
            "sessions": safe_int(r["metrics"][0]),
            "engaged": safe_int(r["metrics"][1]),
            "bounce_rate": round(safe_float(r["metrics"][2]), 3),
        }
        for r in ga_report(
            ["sessionSource", "sessionMedium"],
            ["sessions", "engagedSessions", "bounceRate"],
            limit=20,
        )
    ]

    # Organic landing pages
    organic_filter = FilterExpression(
        filter=Filter(field_name="sessionMedium", string_filter=Filter.StringFilter(value="organic"))
    )
    data["organic_landing_pages"] = [
        {
            "page": r["dims"][0],
            "sessions": safe_int(r["metrics"][0]),
            "bounce_rate": round(safe_float(r["metrics"][2]), 3),
            "duration": round(safe_float(r["metrics"][3]), 1),
        }
        for r in ga_report(
            ["landingPage"],
            ["sessions", "engagedSessions", "bounceRate", "averageSessionDuration"],
            limit=25,
            dim_filter=organic_filter,
        )
    ]

    # Device categories
    data["devices"] = [
        {
            "device": r["dims"][0],
            "sessions": safe_int(r["metrics"][0]),
            "engaged": safe_int(r["metrics"][1]),
            "bounce_rate": round(safe_float(r["metrics"][2]), 3),
            "duration": round(safe_float(r["metrics"][3]), 1),
        }
        for r in ga_report(
            ["deviceCategory"],
            ["sessions", "engagedSessions", "bounceRate", "averageSessionDuration"],
        )
    ]

    # Channel groups
    data["channels"] = [
        {
            "channel": r["dims"][0],
            "sessions": safe_int(r["metrics"][0]),
            "bounce_rate": round(safe_float(r["metrics"][2]), 3),
            "duration": round(safe_float(r["metrics"][3]), 1),
            "pages_per_session": round(safe_float(r["metrics"][4]), 1),
        }
        for r in ga_report(
            ["sessionDefaultChannelGroup"],
            ["sessions", "engagedSessions", "bounceRate", "averageSessionDuration", "screenPageViewsPerSession"],
            limit=10,
        )
    ]

    # Custom events tracking (single batched API call)
    data["custom_events"] = {}
    rows = ga_report(
        ["eventName"], ["eventCount", "totalUsers"],
        dim_filter=FilterExpression(
            filter=Filter(
                field_name="eventName",
                in_list_filter=Filter.InListFilter(values=TRACKED_CUSTOM_EVENTS),
            )
        ),
        limit=len(TRACKED_CUSTOM_EVENTS),
    )
    returned_events = {r["dims"][0]: r for r in rows}
    for ev in TRACKED_CUSTOM_EVENTS:
        r = returned_events.get(ev)
        if r:
            data["custom_events"][ev] = {
                "count": safe_int(r["metrics"][0]),
                "users": safe_int(r["metrics"][1]),
            }
        else:
            data["custom_events"][ev] = {"count": 0, "users": 0}

    # High bounce pages
    all_pages = ga_report(
        ["pagePath"], ["sessions", "bounceRate", "averageSessionDuration"], limit=100
    )
    data["high_bounce_pages"] = sorted(
        [
            {
                "page": r["dims"][0],
                "sessions": safe_int(r["metrics"][0]),
                "bounce_rate": round(safe_float(r["metrics"][1]), 3),
                "duration": round(safe_float(r["metrics"][2]), 1),
            }
            for r in all_pages
            if safe_int(r["metrics"][0]) >= HIGH_BOUNCE_MIN_SESSIONS and safe_float(r["metrics"][1]) > HIGH_BOUNCE_THRESHOLD
        ],
        key=lambda r: r["sessions"],
        reverse=True,
    )[:20]

    # Countries and languages
    data["countries"] = [
        {"country": r["dims"][0], "sessions": safe_int(r["metrics"][0])}
        for r in ga_report(["country"], ["sessions", "engagedSessions"], limit=10)
    ]
    data["languages"] = [
        {"language": r["dims"][0], "sessions": safe_int(r["metrics"][0])}
        for r in ga_report(["language"], ["sessions"], limit=10)
    ]

    # Overall KPIs
    totals = ga_report([], ["sessions", "totalUsers", "engagedSessions", "bounceRate", "averageSessionDuration"])
    if totals:
        t = totals[0]
        data["kpis"] = {
            "sessions": safe_int(t["metrics"][0]),
            "users": safe_int(t["metrics"][1]),
            "engaged_sessions": safe_int(t["metrics"][2]),
            "bounce_rate": round(safe_float(t["metrics"][3]), 3),
            "avg_duration": round(safe_float(t["metrics"][4]), 1),
        }
    else:
        data["kpis"] = {"sessions": 0, "users": 0, "engaged_sessions": 0, "bounce_rate": 0, "avg_duration": 0}

    # Compute derived KPIs
    organic_sessions = sum(
        s["sessions"] for s in data["traffic_sources"] if s["medium"] == "organic"
    )
    ai_sessions = sum(
        s["sessions"]
        for s in data["traffic_sources"]
        if any(ai in s["source"].lower() for ai in AI_PLATFORMS)
    )
    data["kpis"]["organic_sessions"] = organic_sessions
    data["kpis"]["ai_sessions"] = ai_sessions

    # AI traffic breakdown by platform
    data["ai_traffic_breakdown"] = []
    for s in data["traffic_sources"]:
        for platform in AI_PLATFORMS:
            if platform in s["source"].lower():
                data["ai_traffic_breakdown"].append({
                    "platform": s["source"],
                    "medium": s["medium"],
                    "sessions": s["sessions"],
                    "engaged": s["engaged"],
                    "bounce_rate": s["bounce_rate"],
                })
                break
    data["ai_traffic_breakdown"].sort(key=lambda x: x["sessions"], reverse=True)

    # New vs returning users
    new_ret = ga_report(["newVsReturning"], ["sessions", "engagedSessions", "bounceRate", "averageSessionDuration"])
    data["new_vs_returning"] = [
        {
            "type": r["dims"][0],
            "sessions": safe_int(r["metrics"][0]),
            "engaged": safe_int(r["metrics"][1]),
            "bounce_rate": round(safe_float(r["metrics"][2]), 3),
            "duration": round(safe_float(r["metrics"][3]), 1),
        }
        for r in new_ret
    ]

    # Engagement depth: pages per session by channel
    data["kpis"]["new_user_sessions"] = sum(
        u["sessions"] for u in data["new_vs_returning"] if u["type"] == "new"
    )
    data["kpis"]["returning_user_sessions"] = sum(
        u["sessions"] for u in data["new_vs_returning"] if u["type"] == "returning"
    )

    # Mobile vs desktop bounce divergence
    mobile = next((d for d in data["devices"] if d["device"] == "mobile"), None)
    desktop = next((d for d in data["devices"] if d["device"] == "desktop"), None)
    if mobile and desktop:
        data["kpis"]["mobile_bounce"] = mobile["bounce_rate"]
        data["kpis"]["desktop_bounce"] = desktop["bounce_rate"]
        data["kpis"]["bounce_divergence"] = round(abs(mobile["bounce_rate"] - desktop["bounce_rate"]), 3)
    else:
        data["kpis"]["mobile_bounce"] = 0
        data["kpis"]["desktop_bounce"] = 0
        data["kpis"]["bounce_divergence"] = 0

    return data


# ═══════════════════════════════════════════════════════════════
# TREND COMPARISON
# ═══════════════════════════════════════════════════════════════

def compare_kpis(current, previous):
    """Compare current run KPIs with previous run. Returns list of changes."""
    changes = []
    gsc_cur = current["gsc"]["kpis"]
    gsc_prev = previous.get("gsc", {}).get("kpis", {})
    ga_cur = current["ga4"]["kpis"]
    ga_prev = previous.get("ga4", {}).get("kpis", {})

    kpi_defs = [
        ("GSC Clicks", gsc_cur.get("clicks", 0), gsc_prev.get("clicks", 0), False),
        ("GSC Impressions", gsc_cur.get("impressions", 0), gsc_prev.get("impressions", 0), False),
        ("GSC CTR", gsc_cur.get("ctr", 0), gsc_prev.get("ctr", 0), True),
        ("GSC Avg Position", gsc_cur.get("position", 0), gsc_prev.get("position", 0), True),
        ("GA4 Sessions", ga_cur.get("sessions", 0), ga_prev.get("sessions", 0), False),
        ("GA4 Organic Sessions", ga_cur.get("organic_sessions", 0), ga_prev.get("organic_sessions", 0), False),
        ("GA4 AI Sessions", ga_cur.get("ai_sessions", 0), ga_prev.get("ai_sessions", 0), False),
        ("GA4 Bounce Rate", ga_cur.get("bounce_rate", 0), ga_prev.get("bounce_rate", 0), True),
        ("GA4 Avg Duration", ga_cur.get("avg_duration", 0), ga_prev.get("avg_duration", 0), False),
    ]

    for name, cur, prev, is_rate in kpi_defs:
        if prev == 0:
            pct = "new" if cur > 0 else "—"
        elif is_rate:
            pct = f"{((cur - prev) / max(abs(prev), 0.0001)) * 100:+.1f}%"
        else:
            pct = f"{((cur - prev) / prev) * 100:+.1f}%"

        emoji = ""
        if prev > 0:
            delta = cur - prev
            # For position, lower is better
            if name == "GSC Avg Position":
                emoji = "🟢" if delta < -0.5 else ("🔴" if delta > 0.5 else "⚪")
            # For bounce rate, lower is better
            elif name == "GA4 Bounce Rate":
                emoji = "🟢" if delta < -0.02 else ("🔴" if delta > 0.02 else "⚪")
            else:
                emoji = "🟢" if delta > 0 else ("🔴" if delta < 0 else "⚪")

        changes.append({
            "name": name,
            "current": cur,
            "previous": prev,
            "change": pct,
            "emoji": emoji,
        })

    return changes


def format_kpi_value(name, value):
    """Format a KPI value for display in the markdown report."""
    if "CTR" in name or "Bounce" in name:
        return f"{value:.2%}"
    if "Position" in name:
        return f"{value:.1f}"
    if isinstance(value, (int, float)) and value > 1:
        return f"{value:,.0f}"
    return str(value)


# ═══════════════════════════════════════════════════════════════
# MARKDOWN REPORT GENERATION
# ═══════════════════════════════════════════════════════════════

def generate_markdown(data, previous=None):
    """Generate a Markdown report for a GitHub Issue."""
    lines = []
    run_date = data["meta"]["run_date"]
    period = data["meta"]["period"]

    lines.append(f"# 📊 SEO Audit Report — {run_date}")
    lines.append(f"\n**Period**: {period['start']} → {period['end']} (90 days)")
    lines.append(f"**Site**: {SITE}")
    lines.append("")

    # ── KPI Summary ──
    lines.append("## 📈 KPI Summary")
    lines.append("")

    if previous:
        changes = compare_kpis(data, previous)
        lines.append("| KPI | Current | Previous | Change |")
        lines.append("|-----|---------|----------|--------|")
        for c in changes:
            cur_fmt = format_kpi_value(c["name"], c["current"])
            prev_fmt = format_kpi_value(c["name"], c["previous"])
            lines.append(f"| {c['emoji']} {c['name']} | {cur_fmt} | {prev_fmt} | {c['change']} |")
    else:
        gsc_k = data["gsc"]["kpis"]
        ga_k = data["ga4"]["kpis"]
        lines.append("| KPI | Value |")
        lines.append("|-----|-------|")
        lines.append(f"| GSC Clicks | {gsc_k['clicks']:,.0f} |")
        lines.append(f"| GSC Impressions | {gsc_k['impressions']:,.0f} |")
        lines.append(f"| GSC CTR | {gsc_k['ctr']:.2%} |")
        lines.append(f"| GSC Avg Position | {gsc_k['position']:.1f} |")
        lines.append(f"| GA4 Sessions | {ga_k['sessions']:,.0f} |")
        lines.append(f"| GA4 Organic Sessions | {ga_k['organic_sessions']:,.0f} |")
        lines.append(f"| GA4 AI Sessions | {ga_k['ai_sessions']:,.0f} |")
        lines.append(f"| GA4 Bounce Rate | {ga_k['bounce_rate']:.2%} |")
        lines.append(f"| GA4 Avg Duration | {ga_k['avg_duration']:.0f}s |")
    lines.append("")

    # ── Quick Wins ──
    lines.append("## 🎯 Quick Wins (High Impressions, Low CTR)")
    lines.append("")
    if data["gsc"]["quick_wins"]:
        lines.append("| Page | Clicks | Impressions | CTR | Position |")
        lines.append("|------|--------|-------------|-----|----------|")
        for r in data["gsc"]["quick_wins"][:10]:
            path = r["page"].replace(SITE, "/")
            lines.append(f"| `{path}` | {r['clicks']} | {r['impressions']:,} | {r['ctr']:.1%} | {r['position']:.1f} |")
    else:
        lines.append("No quick wins identified (all pages with 100+ impressions have CTR ≥ 3%).")
    lines.append("")

    # ── Striking Distance ──
    lines.append("## 🎯 Striking Distance (Position 5-20)")
    lines.append("")
    if data["gsc"]["striking_distance"]:
        lines.append("| Query | Position | Impressions | Clicks | Page |")
        lines.append("|-------|----------|-------------|--------|------|")
        for r in data["gsc"]["striking_distance"][:10]:
            path = r["page"].replace(SITE, "/")
            lines.append(f"| \"{r['query']}\" | {r['position']:.1f} | {r['impressions']:,} | {r['clicks']} | `{path}` |")
    else:
        lines.append("No striking distance queries found.")
    lines.append("")

    # ── Cannibalization ──
    lines.append("## ⚠️ Cannibalization (Multiple Pages for Same Query)")
    lines.append("")
    if data["gsc"]["cannibalization"]:
        for item in data["gsc"]["cannibalization"][:5]:
            lines.append(f"**\"{item['query']}\"** ({item['total_impressions']:,} total impr)")
            for p in sorted(item["pages"], key=lambda x: x["position"]):
                path = p["page"].replace(SITE, "/")
                lines.append(f"- Pos {p['position']:.1f} | {p['clicks']} clicks | {p['impressions']:,} impr | `{path}`")
            lines.append("")
    else:
        lines.append("No cannibalization issues detected.")
        lines.append("")

    # ── Trends ──
    lines.append("## 📈 Query Trends (30d vs Previous 30d)")
    lines.append("")
    lines.append("### Rising")
    lines.append("| Query | Δ Impressions | Current | Previous |")
    lines.append("|-------|---------------|---------|----------|")
    for t in data["gsc"]["trends"]["rising"][:10]:
        if t["impressions_delta"] > 0:
            lines.append(f"| \"{t['query']}\" | +{t['impressions_delta']:,} | {t['impressions_now']:,} | {t['impressions_prev']:,} |")
    lines.append("")
    lines.append("### Declining")
    lines.append("| Query | Δ Impressions | Current | Previous |")
    lines.append("|-------|---------------|---------|----------|")
    for t in data["gsc"]["trends"]["declining"][:10]:
        if t["impressions_delta"] < 0:
            lines.append(f"| \"{t['query']}\" | {t['impressions_delta']:,} | {t['impressions_now']:,} | {t['impressions_prev']:,} |")
    lines.append("")

    # ── GA4 Traffic Sources ──
    lines.append("## 🔗 Traffic Sources")
    lines.append("")
    lines.append("| Source / Medium | Sessions | Engaged | Bounce |")
    lines.append("|-----------------|----------|---------|--------|")
    for s in data["ga4"]["traffic_sources"][:10]:
        lines.append(f"| {s['source']} / {s['medium']} | {s['sessions']:,} | {s['engaged']:,} | {s['bounce_rate']:.0%} |")
    lines.append("")

    # ── Custom Events ──
    lines.append("## 🖱️ Feature Usage (Custom Events)")
    lines.append("")
    lines.append("| Event | Count | Users |")
    lines.append("|-------|-------|-------|")
    for ev, vals in sorted(data["ga4"]["custom_events"].items(), key=lambda x: x[1]["count"], reverse=True):
        emoji = "🔴" if vals["count"] == 0 else ""
        lines.append(f"| {emoji} {ev} | {vals['count']:,} | {vals['users']:,} |")
    lines.append("")

    # ── High Bounce Pages ──
    if data["ga4"]["high_bounce_pages"]:
        lines.append("## ⚠️ High Bounce Pages (>70%, 20+ sessions)")
        lines.append("")
        lines.append("| Page | Sessions | Bounce | Duration |")
        lines.append("|------|----------|--------|----------|")
        for p in data["ga4"]["high_bounce_pages"][:10]:
            lines.append(f"| `{p['page']}` | {p['sessions']:,} | {p['bounce_rate']:.0%} | {p['duration']:.0f}s |")
        lines.append("")

    # ── Search Appearance ──
    lines.append("## 🏷️ Rich Results (Search Appearance)")
    lines.append("")
    if data["gsc"]["search_appearance"]:
        has_event = any(sa["type"].upper() in ("EVENT", "EVENT_LISTING") for sa in data["gsc"]["search_appearance"])
        lines.append("| Type | Clicks | Impressions | CTR |")
        lines.append("|------|--------|-------------|-----|")
        for sa in data["gsc"]["search_appearance"]:
            lines.append(f"| {sa['type']} | {sa['clicks']:,} | {sa['impressions']:,} | {sa['ctr']:.1%} |")
        if not has_event:
            lines.append("")
            lines.append("⚠️ **No Event rich results** despite having Event JSON-LD. Only non-Event types appearing.")
    else:
        lines.append("⚠️ No rich results detected. JSON-LD structured data may need review.")
    lines.append("")

    # ── i18n Cannibalization ──
    i18n_cannibal = data["gsc"].get("i18n_cannibalization", [])
    if i18n_cannibal:
        lines.append("## 🌐 i18n Cannibalization (Same Event, Multiple Locales)")
        lines.append("")
        lines.append("Same event slug indexed under multiple locale prefixes (`/e/`, `/es/e/`, `/en/e/`), splitting ranking signals.")
        lines.append("")
        for item in i18n_cannibal[:8]:
            slug_short = item["slug"][:60] + "..." if len(item["slug"]) > 60 else item["slug"]
            lines.append(f"**{slug_short}** ({item['total_impressions']:,} total impr)")
            for p in sorted(item["pages"], key=lambda x: x["position"]):
                lines.append(f"- [{p['locale']}] Pos {p['position']:.1f} | {p['clicks']} clicks | {p['impressions']:,} impr")
            lines.append("")

    # ── 3-Segment URLs Indexed ──
    three_seg = data["gsc"].get("three_segment_indexed", [])
    if three_seg:
        lines.append("## 🚫 3-Segment URLs Indexed (Should Be Noindexed)")
        lines.append("")
        lines.append("URLs with pattern `/place/date/category` appearing in GSC. These create thin/duplicate content.")
        lines.append("")
        lines.append("| Page | Impressions | Clicks | Position |")
        lines.append("|------|-------------|--------|----------|")
        for r in three_seg[:10]:
            path = r["page"].replace(SITE, "/")
            lines.append(f"| `{path}` | {r['impressions']:,} | {r['clicks']} | {r['position']:.1f} |")
        lines.append("")

    # ── Dead Pages ──
    dead = data["gsc"].get("dead_pages", [])
    if dead:
        lines.append("## 💀 Dead Pages (Impressions but Zero Clicks)")
        lines.append("")
        lines.append("Pages wasting crawl budget — visible in search but never clicked.")
        lines.append("")
        lines.append("| Page | Impressions | Position |")
        lines.append("|------|-------------|----------|")
        for r in dead[:10]:
            path = r["page"].replace(SITE, "/")
            lines.append(f"| `{path}` | {r['impressions']:,} | {r['position']:.1f} |")
        lines.append("")

    # ── Mobile vs Desktop Bounce ──
    bounce_div = data["ga4"]["kpis"].get("bounce_divergence", 0)
    if bounce_div > BOUNCE_DIVERGENCE_THRESHOLD:
        mob_b = data["ga4"]["kpis"].get("mobile_bounce", 0)
        desk_b = data["ga4"]["kpis"].get("desktop_bounce", 0)
        higher = "Desktop" if desk_b > mob_b else "Mobile"
        lines.append("## 📱 Mobile vs Desktop Bounce Divergence")
        lines.append("")
        lines.append(f"| Device | Bounce Rate |")
        lines.append(f"|--------|-------------|")
        lines.append(f"| Mobile | {mob_b:.0%} |")
        lines.append(f"| Desktop | {desk_b:.0%} |")
        lines.append(f"| **Gap** | **{bounce_div:.0%}** |")
        lines.append("")
        lines.append(f"⚠️ {higher} bounce is significantly higher. May indicate bot traffic or UX issues on {higher.lower()}.")
        lines.append("")

    # ── Core Web Vitals ──
    cwv = data.get("cwv", {})
    if cwv:
        lines.append("## ⚡ Core Web Vitals (PageSpeed Insights)")
        lines.append("")
        cwv_thresholds = CWV_THRESHOLDS
        for device_key, device_label in [("mobile", "Mobile"), ("desktop", "Desktop")]:
            device_cwv = cwv.get(device_key)
            if device_cwv:
                lh_score = device_cwv.get("lighthouse_score", "—")
                lines.append(f"### {device_label} (Lighthouse: {lh_score}/100)")
                lines.append("| Metric | p75 | Category | Status |")
                lines.append("|--------|-----|----------|--------|")
                for metric in ["LCP", "CLS", "INP", "FCP", "TTFB"]:
                    p75 = device_cwv.get(metric)
                    category = device_cwv.get(f"{metric}_category", "—")
                    if p75 is not None:
                        threshold = cwv_thresholds.get(metric)
                        if threshold:
                            good_t, poor_t, unit = threshold
                            status = "🟢" if p75 <= good_t else ("🔴" if p75 >= poor_t else "🟡")
                        else:
                            status = "⚪"
                            unit = ""
                        p75_fmt = f"{p75:.3f}" if metric == "CLS" else f"{p75:,.0f}{unit}"
                        lines.append(f"| {metric} | {p75_fmt} | {category} | {status} |")
                lines.append("")
    else:
        lines.append("## ⚡ Core Web Vitals")
        lines.append("")
        lines.append("⚠️ CrUX data not available (site may not have enough traffic for Chrome UX Report).")
        lines.append("")

    # ── AI Overview Zero-Click ──
    ai_suspects = data["gsc"].get("ai_overview_suspects", [])
    if ai_suspects:
        lines.append("## 🤖 AI Overview Suspects (Position 1-3, Zero Clicks)")
        lines.append("")
        lines.append("Queries where you rank top 3 but get 0 clicks — likely answered by AI Overview/featured snippet.")
        lines.append("")
        lines.append("| Query | Position | Impressions |")
        lines.append("|-------|----------|-------------|")
        for r in ai_suspects[:10]:
            lines.append(f"| \"{r['query']}\" | {r['position']:.1f} | {r['impressions']:,} |")
        lines.append("")

    # ── AI Traffic Breakdown ──
    ai_breakdown = data["ga4"].get("ai_traffic_breakdown", [])
    if ai_breakdown:
        lines.append("## 🤖 AI Traffic Breakdown by Platform")
        lines.append("")
        lines.append("| Platform | Medium | Sessions | Engaged | Bounce |")
        lines.append("|----------|--------|----------|---------|--------|")
        for a in ai_breakdown:
            lines.append(f"| {a['platform']} | {a['medium']} | {a['sessions']:,} | {a['engaged']:,} | {a['bounce_rate']:.0%} |")
        total_ai = sum(a["sessions"] for a in ai_breakdown)
        total_sessions = data["ga4"]["kpis"].get("sessions", 0) or 1
        lines.append(f"\n**Total AI traffic: {total_ai:,} sessions ({total_ai/total_sessions:.1%} of all traffic)**")
        lines.append("")

    # ── Expired Events Still Indexed ──
    expired = data["gsc"].get("expired_events_indexed", [])
    if expired:
        lines.append("## 📅 Expired Events Still Indexed")
        lines.append("")
        lines.append("Past events (>30 days old) still appearing in search. Wasted crawl budget and potentially poor UX.")
        lines.append("")
        lines.append("| Page | Event Date | Impressions | Clicks | Position |")
        lines.append("|------|------------|-------------|--------|----------|")
        for r in expired[:10]:
            path = r["page"].replace(SITE, "/")
            lines.append(f"| `{path[:60]}...` | {r['event_date']} | {r['impressions']:,} | {r['clicks']} | {r['position']:.1f} |")
        lines.append("")

    # ── New vs Returning Users ──
    nvr = data["ga4"].get("new_vs_returning", [])
    if nvr:
        lines.append("## 👥 New vs Returning Users")
        lines.append("")
        lines.append("| Type | Sessions | Engaged | Bounce | Duration |")
        lines.append("|------|----------|---------|--------|----------|")
        for u in nvr:
            lines.append(f"| {u['type'].title()} | {u['sessions']:,} | {u['engaged']:,} | {u['bounce_rate']:.0%} | {u['duration']:.0f}s |")
        new_u = next((u for u in nvr if u["type"] == "new"), None)
        ret_u = next((u for u in nvr if u["type"] == "returning"), None)
        if new_u and ret_u and ret_u["sessions"] > 0:
            ratio = new_u["sessions"] / ret_u["sessions"]
            lines.append(f"\n**New:Returning ratio: {ratio:.1f}:1**")
            if ratio > 10:
                lines.append("⚠️ Very few returning users. Consider email newsletters, push notifications, or save-for-later features.")
        lines.append("")

    # ── Actionable Items ──
    lines.append("## ✅ Actionable Items")
    lines.append("")
    actions = generate_actions(data, previous)
    for i, action in enumerate(actions, 1):
        lines.append(f"{i}. **{action['priority']}** — {action['title']}")
        lines.append(f"   {action['description']}")
        lines.append("")

    lines.append("---")
    lines.append(f"*Generated by [seo-audit.yml](../../.github/workflows/seo-audit.yml) on {run_date}*")

    return "\n".join(lines) + "\n"


def generate_actions(data, previous=None):
    """Generate actionable items based on the data."""
    actions = []

    # Check for brand term visibility
    gsc_sd = data["gsc"]["striking_distance"]
    brand_queries = [q for q in gsc_sd if BRAND_TERM in q["query"].lower()]
    if brand_queries:
        worst_pos = max(q["position"] for q in brand_queries)
        if worst_pos > 5:
            actions.append({
                "priority": "P0",
                "title": f"Brand term at position {worst_pos:.0f}",
                "description": f"Brand-related query \"{brand_queries[0]['query']}\" is not in top 5. Optimize homepage meta title/H1 to include brand name.",
            })

    # Check for no rich results
    if not data["gsc"]["search_appearance"]:
        actions.append({
            "priority": "P1",
            "title": "No rich results in search",
            "description": "JSON-LD structured data is not generating rich results. Review Event schema markup, test with Rich Results Test tool.",
        })

    # Check for dead features
    custom = data["ga4"]["custom_events"]
    for ev_name in LOW_USAGE_FEATURES:
        ev = custom.get(ev_name, {"count": 0})
        if ev["count"] < LOW_USAGE_THRESHOLD:
            actions.append({
                "priority": "P2",
                "title": f"Low usage: {ev_name} ({ev['count']} events)",
                "description": f"Feature '{ev_name}' has very low engagement. Consider improving UX visibility or placement.",
            })

    # Check AI referrer tracking
    ai_ev = custom.get("ai_referrer", {"count": 0})
    ai_sessions = data["ga4"]["kpis"].get("ai_sessions", 0)
    if ai_sessions > 0 and ai_ev["count"] == 0:
        actions.append({
            "priority": "P1",
            "title": "AI referrer tracking broken",
            "description": f"GA4 shows {ai_sessions} AI sessions but ai_referrer custom event fires 0 times. Check domain detection list in GoogleScripts.tsx.",
        })

    # Check cannibalization
    if data["gsc"]["cannibalization"]:
        top_cannibal = data["gsc"]["cannibalization"][0]
        actions.append({
            "priority": "P2",
            "title": f"Cannibalization: \"{top_cannibal['query']}\" ({len(top_cannibal['pages'])} pages)",
            "description": "Multiple pages compete for the same query. Consider consolidating content or differentiating meta titles.",
        })

    # Check quick wins
    if data["gsc"]["quick_wins"]:
        top_qw = data["gsc"]["quick_wins"][0]
        actions.append({
            "priority": "P1",
            "title": f"Quick win: {top_qw['impressions']:,} impressions at {top_qw['ctr']:.1%} CTR",
            "description": f"Page `{top_qw['page'].replace(SITE, '/')}` has high visibility but low click-through. Improve meta title/description.",
        })

    # i18n cannibalization
    i18n = data["gsc"].get("i18n_cannibalization", [])
    if i18n:
        actions.append({
            "priority": "P1",
            "title": f"i18n cannibalization: {len(i18n)} events with competing locale URLs",
            "description": "Same event pages indexed under /e/, /es/e/, /en/e/ split ranking signals. Review hreflang tags and canonical URLs to consolidate.",
        })

    # 3-segment URLs indexed
    three_seg = data["gsc"].get("three_segment_indexed", [])
    if three_seg:
        total_impr = sum(r["impressions"] for r in three_seg)
        actions.append({
            "priority": "P1",
            "title": f"3-segment URLs indexed: {len(three_seg)} pages ({total_impr:,} impressions)",
            "description": "URLs like /place/date/category are indexed but create thin/duplicate content. Add noindex in proxy.ts and remove from sitemaps.",
        })

    # Dead pages
    dead = data["gsc"].get("dead_pages", [])
    if len(dead) >= 5:
        total_impr = sum(r["impressions"] for r in dead)
        actions.append({
            "priority": "P2",
            "title": f"Dead pages: {len(dead)} pages with {total_impr:,} impressions and 0 clicks",
            "description": "Pages visible in search but never clicked waste crawl budget. Consider improving meta or noindexing low-value pages.",
        })

    # Rich results gap (has search appearances but no Event rich results specifically)
    sa_types = [s["type"].upper() for s in data["gsc"].get("search_appearance", [])]
    has_event_rich = any(t in ("EVENT", "EVENT_LISTING") for t in sa_types)
    if sa_types and not has_event_rich:
        actions.append({
            "priority": "P1",
            "title": "No Event rich results despite JSON-LD schema",
            "description": "Site has Event structured data but Google shows no Event rich results. Test with Rich Results Test, check for schema errors (missing fields, price issues).",
        })

    # Mobile vs desktop bounce divergence
    bounce_div = data["ga4"]["kpis"].get("bounce_divergence", 0)
    if bounce_div > BOUNCE_DIVERGENCE_THRESHOLD:
        mob_b = data["ga4"]["kpis"].get("mobile_bounce", 0)
        desk_b = data["ga4"]["kpis"].get("desktop_bounce", 0)
        higher = "Desktop" if desk_b > mob_b else "Mobile"
        actions.append({
            "priority": "P2",
            "title": f"{higher} bounce {bounce_div:.0%} higher than {'mobile' if higher == 'Desktop' else 'desktop'}",
            "description": f"{higher} bounce rate ({max(mob_b, desk_b):.0%}) diverges significantly. May indicate bot traffic or UX issues specific to {higher.lower()} experience.",
        })

    # AI traffic growth (when comparing with previous)
    if previous:
        ai_cur = data["ga4"]["kpis"].get("ai_sessions", 0)
        ai_prev = previous.get("ga4", {}).get("kpis", {}).get("ai_sessions", 0)
        if ai_cur > ai_prev and ai_prev > 0:
            growth = ((ai_cur - ai_prev) / ai_prev) * 100
            actions.append({
                "priority": "INFO",
                "title": f"AI traffic growing: {ai_prev} → {ai_cur} sessions (+{growth:.0f}%)",
                "description": "AI-referred traffic is increasing. Ensure AI referrer tracking is working and content is optimized for AI citation.",
            })
        elif ai_cur > 0 and ai_prev == 0:
            actions.append({
                "priority": "INFO",
                "title": f"New AI traffic detected: {ai_cur} sessions",
                "description": "AI-referred sessions appeared for the first time. Monitor growth and ensure tracking is configured.",
            })

    # Core Web Vitals issues
    cwv = data.get("cwv", {})
    cwv_labels = {"LCP": "Largest Contentful Paint", "INP": "Interaction to Next Paint", "CLS": "Cumulative Layout Shift"}
    cwv_advice = {
        "LCP": "Optimize images, reduce server response time, or defer non-critical resources.",
        "INP": "Reduce JavaScript execution time, break up long tasks.",
        "CLS": "Add size attributes to images/ads, avoid dynamic content injection above fold.",
    }
    for device_key, device_label in [("mobile", "Mobile"), ("desktop", "Desktop")]:
        device_cwv = cwv.get(device_key, {})
        if device_cwv:
            for metric in ["LCP", "INP", "CLS"]:
                val = device_cwv.get(metric, 0)
                good_t, poor_t, unit = CWV_THRESHOLDS[metric]
                if val > poor_t:
                    fmt = f"{val:.3f}" if metric == "CLS" else f"{val:,.0f}{unit}"
                    actions.append({
                        "priority": "P1",
                        "title": f"Poor {metric} on {device_label}: {fmt} (threshold: {good_t}{unit})",
                        "description": f"{device_label} {cwv_labels[metric]} is in the 'poor' range. {cwv_advice[metric]}",
                    })
                elif val > good_t:
                    fmt = f"{val:.3f}" if metric == "CLS" else f"{val:,.0f}{unit}"
                    actions.append({
                        "priority": "P2",
                        "title": f"{metric} needs improvement on {device_label}: {fmt}",
                        "description": f"{device_label} {metric} is above 'good' threshold ({good_t}{unit}). Consider optimization.",
                    })

    # AI Overview zero-click queries
    ai_suspects = data["gsc"].get("ai_overview_suspects", [])
    if len(ai_suspects) >= 3:
        total_impr = sum(r["impressions"] for r in ai_suspects)
        actions.append({
            "priority": "P2",
            "title": f"AI Overview impact: {len(ai_suspects)} queries with 0 clicks at top 3 ({total_impr:,} impressions)",
            "description": "Queries where you rank 1-3 but get no clicks — likely answered by AI Overview. Consider adding FAQ schema, unique data, or visual content to earn the click.",
        })

    # Expired events wasting crawl budget
    expired = data["gsc"].get("expired_events_indexed", [])
    if len(expired) >= 5:
        total_impr = sum(r["impressions"] for r in expired)
        actions.append({
            "priority": "P2",
            "title": f"Expired events: {len(expired)} past events still indexed ({total_impr:,} impressions)",
            "description": "Events >30 days old still appear in search results. Consider adding automatic noindex for past events or redirecting to current editions.",
        })

    # Low returning user ratio
    new_sessions = data["ga4"]["kpis"].get("new_user_sessions", 0)
    ret_sessions = data["ga4"]["kpis"].get("returning_user_sessions", 0)
    if ret_sessions > 0 and new_sessions / ret_sessions > 10:
        actions.append({
            "priority": "P2",
            "title": f"Very low returning users ({ret_sessions:,} returning vs {new_sessions:,} new)",
            "description": "Most users don't come back. Consider push notifications, email digest, save/favorite features, or 'events near me' alerts.",
        })

    # Trend-based actions
    if previous:
        changes = compare_kpis(data, previous)
        for c in changes:
            if c["emoji"] == "🔴" and c["previous"] > 0:
                actions.append({
                    "priority": "P1",
                    "title": f"Declining: {c['name']} ({c['change']})",
                    "description": f"{c['name']} dropped from {c['previous']} to {c['current']}. Investigate potential causes.",
                })

    if not actions:
        actions.append({
            "priority": "INFO",
            "title": "All metrics healthy",
            "description": "No critical issues detected. Continue monitoring.",
        })

    return sorted(actions, key=lambda a: {"P0": 0, "P1": 1, "P2": 2, "INFO": 3}.get(a["priority"], 4))


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="SEO Audit: GSC + GA4")
    parser.add_argument("--previous", help="Path to previous audit JSON for trend comparison")
    args = parser.parse_args()

    # Collect data
    gsc_data = collect_gsc_data()
    ga4_data = collect_ga4_data()
    cwv_data = collect_cwv_data()

    # Build output
    audit_data = {
        "meta": {
            "run_date": TODAY.strftime("%Y-%m-%d"),
            "period": {"start": START_90, "end": END},
            "comparison_period": {"start": START_PREV, "end": END_PREV},
            "site": SITE,
            "ga4_property": GA_PROPERTY,
        },
        "gsc": gsc_data,
        "ga4": ga4_data,
        "cwv": cwv_data,
    }

    # Load previous data if available
    previous = None
    if args.previous and os.path.exists(args.previous):
        print(f"📂 Loading previous audit from {args.previous}")
        try:
            with open(args.previous, encoding="utf-8") as f:
                previous = json.load(f)
        except (json.JSONDecodeError, OSError) as e:
            print(f"⚠️ Failed to load previous audit: {e}")

    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Write JSON
    json_path = os.path.join(OUTPUT_DIR, "seo-audit-data.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(audit_data, f, indent=2, default=str)
    print(f"✅ JSON saved to {json_path}")

    # Generate and write Markdown
    md_content = generate_markdown(audit_data, previous)
    md_path = os.path.join(OUTPUT_DIR, "seo-audit-report.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_content)
    print(f"✅ Markdown report saved to {md_path}")

    # Print summary to stdout for workflow logs
    print("\n" + "=" * 60)
    print("AUDIT SUMMARY")
    print("=" * 60)
    gsc_k = gsc_data["kpis"]
    ga_k = ga4_data["kpis"]
    print(f"  GSC: {gsc_k['clicks']:,} clicks | {gsc_k['impressions']:,} impr | CTR {gsc_k['ctr']:.2%} | Pos {gsc_k['position']:.1f}")
    print(f"  GA4: {ga_k['sessions']:,} sessions | {ga_k['organic_sessions']:,} organic | {ga_k['ai_sessions']:,} AI")
    print(f"  Bounce: {ga_k['bounce_rate']:.0%} | Avg duration: {ga_k['avg_duration']:.0f}s")
    print(f"  Quick wins: {len(gsc_data['quick_wins'])} | Cannibalization: {len(gsc_data['cannibalization'])}")
    print(f"  i18n cannibal: {len(gsc_data.get('i18n_cannibalization', []))} | 3-seg indexed: {len(gsc_data.get('three_segment_indexed', []))} | Dead pages: {len(gsc_data.get('dead_pages', []))}")
    print(f"  AI Overview suspects: {len(gsc_data.get('ai_overview_suspects', []))} | Expired events indexed: {len(gsc_data.get('expired_events_indexed', []))}")
    print(f"  Rich results: {'Yes' if gsc_data['search_appearance'] else 'None'} | Bounce gap: {ga_k.get('bounce_divergence', 0):.0%}")
    cwv_overall = cwv_data.get("overall", {})
    if cwv_overall:
        print(f"  CWV: LCP {cwv_overall.get('LCP', '?')}ms | CLS {cwv_overall.get('CLS', '?')} | INP {cwv_overall.get('INP', '?')}ms")
    print(f"  Users: {ga_k.get('new_user_sessions', 0):,} new | {ga_k.get('returning_user_sessions', 0):,} returning")

    actions = generate_actions(audit_data, previous)
    print(f"\n  Actionable items: {len(actions)}")
    for a in actions:
        print(f"    [{a['priority']}] {a['title']}")


if __name__ == "__main__":
    main()
