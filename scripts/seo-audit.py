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
import sys
import argparse
from datetime import datetime, timedelta
from collections import defaultdict

import google.auth
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

TODAY = datetime.now()
END = (TODAY - timedelta(days=3)).strftime("%Y-%m-%d")
START_90 = (TODAY - timedelta(days=93)).strftime("%Y-%m-%d")
START_30 = (TODAY - timedelta(days=33)).strftime("%Y-%m-%d")
END_PREV = (TODAY - timedelta(days=34)).strftime("%Y-%m-%d")
START_PREV = (TODAY - timedelta(days=63)).strftime("%Y-%m-%d")

# ─── AUTH ───
credentials, project = google.auth.default(
    scopes=[
        "https://www.googleapis.com/auth/webmasters.readonly",
        "https://www.googleapis.com/auth/analytics.readonly",
    ]
)
gsc = build("searchconsole", "v1", credentials=credentials)
ga = BetaAnalyticsDataClient(credentials=credentials)


# ─── HELPERS ───
def gsc_query(dims, start, end, limit=500, filters=None):
    body = {"startDate": start, "endDate": end, "dimensions": dims, "rowLimit": limit}
    if filters:
        body["dimensionFilterGroups"] = [{"filters": filters}]
    return gsc.searchanalytics().query(siteUrl=SITE, body=body).execute().get("rows", [])


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
    resp = ga.run_report(req)
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
            if r["impressions"] >= 100 and r["ctr"] < 0.03
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
            if 5 <= r["position"] <= 20 and r["impressions"] >= 10
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

    # Custom events tracking
    custom_events = [
        "filter_change", "search", "share", "add_to_calendar", "load_more",
        "outbound_click", "view_event_page", "hero_cta_click", "sponsor_click",
        "select_category", "home_chip_click", "ai_referrer",
    ]
    data["custom_events"] = {}
    for ev in custom_events:
        rows = ga_report(
            ["eventName"], ["eventCount", "totalUsers"],
            dim_filter=FilterExpression(
                filter=Filter(field_name="eventName", string_filter=Filter.StringFilter(value=ev))
            ),
        )
        if rows:
            data["custom_events"][ev] = {
                "count": safe_int(rows[0]["metrics"][0]),
                "users": safe_int(rows[0]["metrics"][1]),
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
            if safe_int(r["metrics"][0]) >= 20 and safe_float(r["metrics"][1]) > 0.7
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
        if any(ai in s["source"] for ai in ["chatgpt", "perplexity", "copilot", "gemini", "claude"])
    )
    data["kpis"]["organic_sessions"] = organic_sessions
    data["kpis"]["ai_sessions"] = ai_sessions

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
            cur_fmt = f"{c['current']:.2%}" if "CTR" in c["name"] or "Bounce" in c["name"] else f"{c['current']:,.0f}" if isinstance(c["current"], (int, float)) and c["current"] > 1 else str(c["current"])
            prev_fmt = f"{c['previous']:.2%}" if "CTR" in c["name"] or "Bounce" in c["name"] else f"{c['previous']:,.0f}" if isinstance(c["previous"], (int, float)) and c["previous"] > 1 else str(c["previous"])
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
        lines.append("| Type | Clicks | Impressions | CTR |")
        lines.append("|------|--------|-------------|-----|")
        for sa in data["gsc"]["search_appearance"]:
            lines.append(f"| {sa['type']} | {sa['clicks']:,} | {sa['impressions']:,} | {sa['ctr']:.1%} |")
    else:
        lines.append("⚠️ No rich results detected. JSON-LD structured data may need review.")
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

    return "\n".join(lines)


def generate_actions(data, previous=None):
    """Generate actionable items based on the data."""
    actions = []

    # Check for brand term visibility
    gsc_sd = data["gsc"]["striking_distance"]
    brand_queries = [q for q in gsc_sd if "esdeveniment" in q["query"].lower()]
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
    for ev_name in ["share", "add_to_calendar"]:
        ev = custom.get(ev_name, {"count": 0})
        if ev["count"] < 50:
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
    }

    # Load previous data if available
    previous = None
    if args.previous and os.path.exists(args.previous):
        print(f"📂 Loading previous audit from {args.previous}")
        with open(args.previous) as f:
            previous = json.load(f)

    # Write JSON
    json_path = os.path.join(OUTPUT_DIR, "seo-audit-data.json")
    with open(json_path, "w") as f:
        json.dump(audit_data, f, indent=2, default=str)
    print(f"✅ JSON saved to {json_path}")

    # Generate and write Markdown
    md_content = generate_markdown(audit_data, previous)
    md_path = os.path.join(OUTPUT_DIR, "seo-audit-report.md")
    with open(md_path, "w") as f:
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
    print(f"  Rich results: {'Yes' if gsc_data['search_appearance'] else 'None'}")

    actions = generate_actions(audit_data, previous)
    print(f"\n  Actionable items: {len(actions)}")
    for a in actions:
        print(f"    [{a['priority']}] {a['title']}")


if __name__ == "__main__":
    main()
