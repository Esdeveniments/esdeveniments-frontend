#!/usr/bin/env python3
"""
GA4 Analytics Dashboard for Esdeveniments.cat

Usage:
    python3 scripts/ga-dashboard.py              # Last 7 days overview
    python3 scripts/ga-dashboard.py --days 30    # Last 30 days
    python3 scripts/ga-dashboard.py --realtime   # Real-time only
    python3 scripts/ga-dashboard.py --events     # Custom events deep-dive
    python3 scripts/ga-dashboard.py --publish    # Publish funnel analysis
    python3 scripts/ga-dashboard.py --search     # Search terms + filters
    python3 scripts/ga-dashboard.py --all        # Everything
    python3 scripts/ga-dashboard.py --md         # Output Markdown (for CI)

Auth (in priority order):
  1. GOOGLE_APPLICATION_CREDENTIALS env var (service account — CI/CD)
  2. gcloud ADC (local dev: gcloud auth application-default login)
"""
import json
import os
import subprocess
import sys
import urllib.request
import urllib.error
from datetime import datetime

PROPERTY_ID = "406884331"
QUOTA_PROJECT = "esdeveniments-3"
BASE_URL = f"https://analyticsdata.googleapis.com/v1beta/properties/{PROPERTY_ID}"


def get_token():
    """Get access token from service account (CI) or gcloud ADC (local).

    Returns (token, is_service_account) tuple.
    """
    # Service account via google-auth library (CI/CD)
    sa_key = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if sa_key and os.path.exists(sa_key):
        try:
            import google.auth
            import google.auth.transport.requests
            credentials, _ = google.auth.default(
                scopes=["https://www.googleapis.com/auth/analytics.readonly"]
            )
            credentials.refresh(google.auth.transport.requests.Request())
            return credentials.token, True
        except ImportError:
            pass  # Fall through to gcloud CLI
        except Exception as e:
            print(f"  ⚠️ SA auth failed ({e}), falling back to gcloud CLI")

    # gcloud ADC (local development)
    token = subprocess.check_output(
        ["gcloud", "auth", "application-default", "print-access-token"],
        text=True,
        stderr=subprocess.DEVNULL,
    ).strip()
    return token, False


def api_call(endpoint, body):
    token, is_sa = get_token()
    data = json.dumps(body).encode()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    # Only set quota project for ADC (local); SA derives it automatically.
    # SA without serviceusage.serviceUsageConsumer role fails if header is set.
    if not is_sa:
        headers["x-goog-user-project"] = QUOTA_PROJECT
    req = urllib.request.Request(
        f"{BASE_URL}:{endpoint}",
        data=data,
        headers=headers,
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body_text = e.read().decode()
        try:
            err = json.loads(body_text)
            print(f"  API Error: {err.get('error', {}).get('message', body_text)}")
        except json.JSONDecodeError:
            print(f"  API Error: {body_text[:200]}")
        return {"rows": []}


def extract_rows(data):
    """Extract rows as list of (dimensions, metrics) tuples."""
    rows = []
    for r in data.get("rows", []):
        dims = [d["value"] for d in r.get("dimensionValues", [])]
        mets = [m["value"] for m in r.get("metricValues", [])]
        rows.append((dims, mets))
    return rows


def fmt_bounce(val):
    try:
        return f"{float(val)*100:.0f}%"
    except (ValueError, TypeError):
        return val


def fmt_duration(val):
    try:
        secs = float(val)
        if secs >= 60:
            return f"{secs/60:.1f}m"
        return f"{secs:.0f}s"
    except (ValueError, TypeError):
        return val


def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


# ── Dashboard sections ──────────────────────────────────────

def show_realtime():
    section("REAL-TIME (last 30 min)")
    data = api_call("runRealtimeReport", {
        "dimensions": [{"name": "unifiedScreenName"}],
        "metrics": [{"name": "activeUsers"}, {"name": "screenPageViews"}],
        "orderBys": [{"metric": {"metricName": "activeUsers"}, "desc": True}],
        "limit": 15,
    })
    rows = extract_rows(data)
    total = sum(int(m[0]) for _, m in rows)
    print(f"\n  🟢 Active users: {total}\n")
    if rows:
        print(f"  {'Users':>5}  {'Views':>5}  Page")
        print(f"  {'─'*5}  {'─'*5}  {'─'*40}")
        for dims, mets in rows:
            page = dims[0][:55]
            print(f"  {mets[0]:>5}  {mets[1]:>5}  {page}")


def show_daily_overview(days):
    section(f"DAILY OVERVIEW (last {days} days)")
    data = api_call("runReport", {
        "dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "today"}],
        "dimensions": [{"name": "date"}],
        "metrics": [
            {"name": "activeUsers"},
            {"name": "sessions"},
            {"name": "screenPageViews"},
            {"name": "bounceRate"},
            {"name": "averageSessionDuration"},
        ],
        "orderBys": [{"dimension": {"dimensionName": "date"}}],
    })
    rows = extract_rows(data)
    print(f"\n  {'Date':>10}  {'Users':>6}  {'Sessions':>8}  {'Views':>6}  {'Bounce':>7}  {'AvgDur':>7}")
    print(f"  {'─'*10}  {'─'*6}  {'─'*8}  {'─'*6}  {'─'*7}  {'─'*7}")
    total_users = total_sessions = total_views = 0
    for dims, mets in rows:
        d = dims[0]
        date_str = f"{d[0:4]}-{d[4:6]}-{d[6:8]}"
        total_users += int(mets[0])
        total_sessions += int(mets[1])
        total_views += int(mets[2])
        print(f"  {date_str:>10}  {mets[0]:>6}  {mets[1]:>8}  {mets[2]:>6}  {fmt_bounce(mets[3]):>7}  {fmt_duration(mets[4]):>7}")
    print(f"  {'─'*10}  {'─'*6}  {'─'*8}  {'─'*6}")
    print(f"  {'TOTAL':>10}  {total_users:>6}  {total_sessions:>8}  {total_views:>6}")


def show_traffic_sources(days):
    section(f"TRAFFIC SOURCES (last {days} days)")
    data = api_call("runReport", {
        "dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "today"}],
        "dimensions": [{"name": "sessionDefaultChannelGroup"}],
        "metrics": [
            {"name": "sessions"},
            {"name": "activeUsers"},
            {"name": "screenPageViews"},
            {"name": "bounceRate"},
        ],
        "orderBys": [{"metric": {"metricName": "sessions"}, "desc": True}],
    })
    rows = extract_rows(data)
    total_sessions = sum(int(m[0]) for _, m in rows)
    print(f"\n  {'Channel':>20}  {'Sessions':>8}  {'%':>5}  {'Users':>6}  {'Views':>6}  {'Bounce':>7}")
    print(f"  {'─'*20}  {'─'*8}  {'─'*5}  {'─'*6}  {'─'*6}  {'─'*7}")
    for dims, mets in rows:
        pct = f"{int(mets[0])/total_sessions*100:.0f}%" if total_sessions else "?"
        print(f"  {dims[0]:>20}  {mets[0]:>8}  {pct:>5}  {mets[1]:>6}  {mets[2]:>6}  {fmt_bounce(mets[3]):>7}")


def show_top_pages(days):
    section(f"TOP PAGES (last {days} days)")
    data = api_call("runReport", {
        "dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "today"}],
        "dimensions": [{"name": "pagePath"}],
        "metrics": [
            {"name": "screenPageViews"},
            {"name": "activeUsers"},
            {"name": "averageSessionDuration"},
        ],
        "orderBys": [{"metric": {"metricName": "screenPageViews"}, "desc": True}],
        "limit": 20,
    })
    rows = extract_rows(data)
    print(f"\n  {'Views':>6}  {'Users':>6}  {'AvgDur':>7}  Page")
    print(f"  {'─'*6}  {'─'*6}  {'─'*7}  {'─'*50}")
    for dims, mets in rows:
        page = dims[0][:60]
        print(f"  {mets[0]:>6}  {mets[1]:>6}  {fmt_duration(mets[2]):>7}  {page}")


def show_devices_geo(days):
    section(f"DEVICES & GEOGRAPHY (last {days} days)")

    # Devices
    data = api_call("runReport", {
        "dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "today"}],
        "dimensions": [{"name": "deviceCategory"}],
        "metrics": [{"name": "sessions"}, {"name": "activeUsers"}, {"name": "screenPageViews"}],
        "orderBys": [{"metric": {"metricName": "sessions"}, "desc": True}],
    })
    rows = extract_rows(data)
    print(f"\n  Devices:")
    for dims, mets in rows:
        print(f"    {dims[0]:>12}  sessions={mets[0]:>5}  users={mets[1]:>5}  views={mets[2]:>5}")

    # Countries
    data = api_call("runReport", {
        "dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "today"}],
        "dimensions": [{"name": "country"}],
        "metrics": [{"name": "sessions"}, {"name": "activeUsers"}],
        "orderBys": [{"metric": {"metricName": "sessions"}, "desc": True}],
        "limit": 8,
    })
    rows = extract_rows(data)
    print(f"\n  Top countries:")
    for dims, mets in rows:
        print(f"    {dims[0]:>20}  sessions={mets[0]:>5}  users={mets[1]:>5}")


def show_custom_events(days):
    section(f"CUSTOM EVENTS (last {days} days)")
    data = api_call("runReport", {
        "dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "today"}],
        "dimensions": [{"name": "eventName"}],
        "metrics": [{"name": "eventCount"}, {"name": "totalUsers"}],
        "orderBys": [{"metric": {"metricName": "eventCount"}, "desc": True}],
        "limit": 30,
    })
    rows = extract_rows(data)
    # Filter out GA4 auto events for custom-only view
    auto_events = {"session_start", "first_visit", "user_engagement", "page_view"}
    print(f"\n  {'Count':>6}  {'Users':>6}  Event")
    print(f"  {'─'*6}  {'─'*6}  {'─'*35}")
    for dims, mets in rows:
        marker = "" if dims[0] in auto_events else " ◀"
        print(f"  {mets[0]:>6}  {mets[1]:>6}  {dims[0]}{marker}")


def show_publish_funnel(days):
    section(f"PUBLISH FUNNEL (last {days} days)")
    data = api_call("runReport", {
        "dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "today"}],
        "dimensions": [{"name": "eventName"}],
        "metrics": [{"name": "eventCount"}, {"name": "totalUsers"}],
        "dimensionFilter": {
            "filter": {
                "fieldName": "eventName",
                "stringFilter": {"matchType": "CONTAINS", "value": "publish"},
            }
        },
        "orderBys": [{"metric": {"metricName": "eventCount"}, "desc": True}],
    })
    rows = extract_rows(data)
    print(f"\n  {'Count':>6}  {'Users':>6}  Step")
    print(f"  {'─'*6}  {'─'*6}  {'─'*40}")
    for dims, mets in rows:
        print(f"  {mets[0]:>6}  {mets[1]:>6}  {dims[0]}")

    # Try to get reason breakdown (only works if custom dimension registered)
    print(f"\n  Publish errors by reason:")
    data = api_call("runReport", {
        "dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "today"}],
        "dimensions": [{"name": "eventName"}, {"name": "customEvent:reason"}],
        "metrics": [{"name": "eventCount"}],
        "dimensionFilter": {
            "orGroup": {
                "expressions": [
                    {"filter": {"fieldName": "eventName", "stringFilter": {"value": "publish_error"}}},
                    {"filter": {"fieldName": "eventName", "stringFilter": {"value": "publish_submit_blocked"}}},
                    {"filter": {"fieldName": "eventName", "stringFilter": {"value": "publish_image_upload_error"}}},
                ]
            }
        },
        "limit": 20,
    })
    rows = extract_rows(data)
    if rows:
        for dims, mets in rows:
            reason = dims[1] if dims[1] != "(not set)" else "unknown"
            print(f"    {mets[0]:>4}x  {dims[0]:35s}  reason={reason}")
    else:
        print("    (no data — register 'reason' custom dimension in GA4 Admin)")

    # Publica form interactions
    print(f"\n  Form interactions:")
    data = api_call("runReport", {
        "dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "today"}],
        "dimensions": [{"name": "eventName"}],
        "metrics": [{"name": "eventCount"}, {"name": "totalUsers"}],
        "dimensionFilter": {
            "filter": {
                "fieldName": "eventName",
                "stringFilter": {"matchType": "CONTAINS", "value": "publica"},
            }
        },
        "orderBys": [{"metric": {"metricName": "eventCount"}, "desc": True}],
    })
    rows = extract_rows(data)
    for dims, mets in rows:
        print(f"    {mets[0]:>4}x ({mets[1]:>3} users)  {dims[0]}")


def show_search_filters(days):
    section(f"SEARCH & FILTERS (last {days} days)")

    # Top search terms
    print(f"\n  Top search terms:")
    data = api_call("runReport", {
        "dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "today"}],
        "dimensions": [{"name": "customEvent:search_term"}],
        "metrics": [{"name": "eventCount"}],
        "dimensionFilter": {
            "filter": {
                "fieldName": "eventName",
                "stringFilter": {"value": "search"},
            }
        },
        "orderBys": [{"metric": {"metricName": "eventCount"}, "desc": True}],
        "limit": 15,
    })
    rows = extract_rows(data)
    if rows:
        for dims, mets in rows:
            term = dims[0] if dims[0] != "(not set)" else "—"
            print(f"    {mets[0]:>4}x  {term}")
    else:
        print("    (no search term data)")

    # Filter changes
    print(f"\n  Filter usage (by key):")
    data = api_call("runReport", {
        "dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "today"}],
        "dimensions": [{"name": "customEvent:filter_key"}, {"name": "customEvent:filter_value"}],
        "metrics": [{"name": "eventCount"}],
        "dimensionFilter": {
            "filter": {
                "fieldName": "eventName",
                "stringFilter": {"matchType": "CONTAINS", "value": "filter"},
            }
        },
        "orderBys": [{"metric": {"metricName": "eventCount"}, "desc": True}],
        "limit": 20,
    })
    rows = extract_rows(data)
    if rows:
        for dims, mets in rows:
            key = dims[0] if dims[0] != "(not set)" else "—"
            val = dims[1] if dims[1] != "(not set)" else ""
            print(f"    {mets[0]:>4}x  {key}={val}")
    else:
        print("    (no filter data)")

    # Share methods
    print(f"\n  Share methods:")
    data = api_call("runReport", {
        "dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "today"}],
        "dimensions": [{"name": "eventName"}, {"name": "customEvent:method"}],
        "metrics": [{"name": "eventCount"}],
        "dimensionFilter": {
            "filter": {
                "fieldName": "eventName",
                "stringFilter": {"matchType": "CONTAINS", "value": "share"},
            }
        },
        "orderBys": [{"metric": {"metricName": "eventCount"}, "desc": True}],
        "limit": 10,
    })
    rows = extract_rows(data)
    if rows:
        for dims, mets in rows:
            print(f"    {mets[0]:>4}x  {dims[0]:20s}  method={dims[1]}")
    else:
        print("    (no share data)")


def show_engagement(days):
    section(f"USER ENGAGEMENT (last {days} days)")

    # Outbound clicks
    print(f"\n  Outbound clicks (users clicking away):")
    data = api_call("runReport", {
        "dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "today"}],
        "dimensions": [{"name": "eventName"}, {"name": "customEvent:link_type"}],
        "metrics": [{"name": "eventCount"}, {"name": "totalUsers"}],
        "dimensionFilter": {
            "filter": {
                "fieldName": "eventName",
                "stringFilter": {"value": "outbound_click"},
            }
        },
        "limit": 10,
    })
    rows = extract_rows(data)
    if rows:
        for dims, mets in rows:
            link = dims[1] if dims[1] != "(not set)" else "general"
            print(f"    {mets[0]:>4}x ({mets[1]:>3} users)  {link}")
    else:
        print("    (no outbound click data)")

    # Restaurant section
    print(f"\n  Restaurant promotion:")
    data = api_call("runReport", {
        "dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "today"}],
        "dimensions": [{"name": "eventName"}],
        "metrics": [{"name": "eventCount"}, {"name": "totalUsers"}],
        "dimensionFilter": {
            "filter": {
                "fieldName": "eventName",
                "stringFilter": {"matchType": "CONTAINS", "value": "restaurant"},
            }
        },
        "orderBys": [{"metric": {"metricName": "eventCount"}, "desc": True}],
    })
    rows = extract_rows(data)
    if rows:
        for dims, mets in rows:
            print(f"    {mets[0]:>4}x ({mets[1]:>3} users)  {dims[0]}")
    else:
        print("    (no restaurant data)")

    # Calendar adds
    print(f"\n  Add to calendar:")
    data = api_call("runReport", {
        "dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "today"}],
        "dimensions": [{"name": "eventName"}, {"name": "customEvent:method"}],
        "metrics": [{"name": "eventCount"}, {"name": "totalUsers"}],
        "dimensionFilter": {
            "filter": {
                "fieldName": "eventName",
                "stringFilter": {"matchType": "CONTAINS", "value": "calendar"},
            }
        },
        "limit": 10,
    })
    rows = extract_rows(data)
    if rows:
        for dims, mets in rows:
            method = dims[1] if dims[1] != "(not set)" else "—"
            print(f"    {mets[0]:>4}x ({mets[1]:>3} users)  {dims[0]}  method={method}")
    else:
        print("    (no calendar data)")

    # Favorites
    print(f"\n  Favorites:")
    data = api_call("runReport", {
        "dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "today"}],
        "dimensions": [{"name": "eventName"}],
        "metrics": [{"name": "eventCount"}, {"name": "totalUsers"}],
        "dimensionFilter": {
            "filter": {
                "fieldName": "eventName",
                "stringFilter": {"matchType": "CONTAINS", "value": "favorite"},
            }
        },
        "orderBys": [{"metric": {"metricName": "eventCount"}, "desc": True}],
    })
    rows = extract_rows(data)
    if rows:
        for dims, mets in rows:
            print(f"    {mets[0]:>4}x ({mets[1]:>3} users)  {dims[0]}")
    else:
        print("    (no favorites data)")


# ── Main ─────────────────────────────────────────────────────

def main():
    args = set(sys.argv[1:])
    days = 7
    if "--days" in args:
        idx = sys.argv.index("--days")
        if idx + 1 < len(sys.argv):
            days = int(sys.argv[idx + 1])

    print(f"\n  📊 Esdeveniments.cat — GA4 Dashboard")
    print(f"  Property: {PROPERTY_ID} | Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"  Period: last {days} days")

    show_all = "--all" in args
    no_flags = not args or args == {"--days", str(days)}

    if "--realtime" in args or show_all or no_flags:
        show_realtime()

    if show_all or no_flags:
        show_daily_overview(days)
        show_traffic_sources(days)
        show_top_pages(days)
        show_devices_geo(days)

    if "--events" in args or show_all or no_flags:
        show_custom_events(days)

    if "--publish" in args or show_all:
        show_publish_funnel(days)

    if "--search" in args or show_all:
        show_search_filters(days)

    if "--engagement" in args or show_all:
        show_engagement(days)

    print(f"\n{'='*60}")
    print(f"  Done. Run with --all for complete dashboard.")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
