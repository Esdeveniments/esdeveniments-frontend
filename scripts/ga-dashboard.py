#!/usr/bin/env python3
"""
GA4 Analytics Dashboard for Esdeveniments.cat

Architecture: Collect-then-render. All GA4 data is fetched into a dict,
then rendered as either terminal text (default) or Markdown (--md for CI).

Usage:
    python3 scripts/ga-dashboard.py              # Quick overview (terminal)
    python3 scripts/ga-dashboard.py --all        # Full dashboard (terminal)
    python3 scripts/ga-dashboard.py --md         # Full Markdown (for CI/GH Issues)
    python3 scripts/ga-dashboard.py --days 30    # Change period
    python3 scripts/ga-dashboard.py --realtime   # Real-time only
    python3 scripts/ga-dashboard.py --events     # Custom events deep-dive
    python3 scripts/ga-dashboard.py --publish    # Publish funnel analysis
    python3 scripts/ga-dashboard.py --search     # Search terms + filters

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

# Events that indicate a user "took action" (North Star components)
ACTION_EVENTS = {"outbound_click", "add_to_calendar", "share", "favorite_add"}

# GA4 auto-collected events (filter from custom events view)
AUTO_EVENTS = {"session_start", "first_visit", "user_engagement", "page_view",
               "scroll", "click", "form_start", "form_submit", "file_download",
               "video_start", "video_progress", "video_complete", "view_search_results"}


# ═══════════════════════════════════════════════════════════════
# AUTH & API
# ═══════════════════════════════════════════════════════════════

def get_token():
    """Get access token. Returns (token, is_service_account)."""
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
            pass
        except Exception as e:
            print(f"  ⚠️ SA auth failed ({e}), falling back to gcloud CLI",
                  file=sys.stderr)

    token = subprocess.check_output(
        ["gcloud", "auth", "application-default", "print-access-token"],
        text=True, stderr=subprocess.DEVNULL,
    ).strip()
    return token, False


def api_call(endpoint, body):
    """Make GA4 API call. Returns parsed JSON or empty-rows fallback."""
    token, is_sa = get_token()
    data = json.dumps(body).encode()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    if not is_sa:
        headers["x-goog-user-project"] = QUOTA_PROJECT
    req = urllib.request.Request(
        f"{BASE_URL}:{endpoint}", data=data, headers=headers,
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body_text = e.read().decode()
        try:
            err = json.loads(body_text)
            msg = err.get("error", {}).get("message", body_text)
        except json.JSONDecodeError:
            msg = body_text[:200]
        print(f"  API Error: {msg}", file=sys.stderr)
        return {"rows": []}


def extract_rows(data):
    """Extract rows as list of (dimensions, metrics) tuples."""
    rows = []
    for r in data.get("rows", []):
        dims = [d["value"] for d in r.get("dimensionValues", [])]
        mets = [m["value"] for m in r.get("metricValues", [])]
        rows.append((dims, mets))
    return rows


def safe_int(val):
    try:
        return int(val)
    except (ValueError, TypeError):
        return 0


def safe_float(val):
    try:
        return float(val)
    except (ValueError, TypeError):
        return 0.0


def fmt_bounce(val):
    try:
        return f"{float(val)*100:.0f}%"
    except (ValueError, TypeError):
        return val


def fmt_duration(val):
    try:
        secs = float(val)
        return f"{secs/60:.1f}m" if secs >= 60 else f"{secs:.0f}s"
    except (ValueError, TypeError):
        return val


def pct(num, den):
    """Return percentage string, e.g. '12.3%'. Returns '—' if den=0."""
    if den == 0:
        return "—"
    return f"{num / den * 100:.1f}%"


def health(rate, good, warn):
    """Return traffic light emoji based on thresholds."""
    if rate >= good:
        return "🟢"
    if rate >= warn:
        return "🟡"
    return "🔴"


# ═══════════════════════════════════════════════════════════════
# DATA COLLECTION (single pass — all API calls happen here)
# ═══════════════════════════════════════════════════════════════

def collect_data(days, sections):
    """Fetch all needed GA4 data into a structured dict."""
    d = {}
    rng = [{"startDate": f"{days}daysAgo", "endDate": "today"}]

    # ── Realtime ──
    if "realtime" in sections:
        d["realtime"] = extract_rows(api_call("runRealtimeReport", {
            "dimensions": [{"name": "unifiedScreenName"}],
            "metrics": [{"name": "activeUsers"}, {"name": "screenPageViews"}],
            "orderBys": [{"metric": {"metricName": "activeUsers"}, "desc": True}],
            "limit": 15,
        }))

    # ── Daily overview ──
    if "overview" in sections:
        d["daily"] = extract_rows(api_call("runReport", {
            "dateRanges": rng,
            "dimensions": [{"name": "date"}],
            "metrics": [
                {"name": "activeUsers"}, {"name": "sessions"},
                {"name": "screenPageViews"}, {"name": "bounceRate"},
                {"name": "averageSessionDuration"},
            ],
            "orderBys": [{"dimension": {"dimensionName": "date"}}],
        }))

    # ── Traffic sources ──
    if "traffic" in sections:
        d["sources"] = extract_rows(api_call("runReport", {
            "dateRanges": rng,
            "dimensions": [{"name": "sessionDefaultChannelGroup"}],
            "metrics": [
                {"name": "sessions"}, {"name": "activeUsers"},
                {"name": "screenPageViews"}, {"name": "bounceRate"},
            ],
            "orderBys": [{"metric": {"metricName": "sessions"}, "desc": True}],
        }))

    # ── Top pages ──
    if "pages" in sections:
        d["pages"] = extract_rows(api_call("runReport", {
            "dateRanges": rng,
            "dimensions": [{"name": "pagePath"}],
            "metrics": [
                {"name": "screenPageViews"}, {"name": "activeUsers"},
                {"name": "averageSessionDuration"},
            ],
            "orderBys": [{"metric": {"metricName": "screenPageViews"}, "desc": True}],
            "limit": 20,
        }))

    # ── Devices ──
    if "devices" in sections:
        d["devices"] = extract_rows(api_call("runReport", {
            "dateRanges": rng,
            "dimensions": [{"name": "deviceCategory"}],
            "metrics": [{"name": "sessions"}, {"name": "activeUsers"},
                        {"name": "screenPageViews"}],
            "orderBys": [{"metric": {"metricName": "sessions"}, "desc": True}],
        }))
        d["countries"] = extract_rows(api_call("runReport", {
            "dateRanges": rng,
            "dimensions": [{"name": "country"}],
            "metrics": [{"name": "sessions"}, {"name": "activeUsers"}],
            "orderBys": [{"metric": {"metricName": "sessions"}, "desc": True}],
            "limit": 8,
        }))

    # ── All custom events (used for behavior funnel + events view) ──
    if "events" in sections or "behavior" in sections:
        d["events"] = extract_rows(api_call("runReport", {
            "dateRanges": rng,
            "dimensions": [{"name": "eventName"}],
            "metrics": [{"name": "eventCount"}, {"name": "totalUsers"}],
            "orderBys": [{"metric": {"metricName": "eventCount"}, "desc": True}],
            "limit": 50,
        }))

    # ── Publish funnel ──
    if "publish" in sections:
        d["publish"] = extract_rows(api_call("runReport", {
            "dateRanges": rng,
            "dimensions": [{"name": "eventName"}],
            "metrics": [{"name": "eventCount"}, {"name": "totalUsers"}],
            "dimensionFilter": {"filter": {
                "fieldName": "eventName",
                "stringFilter": {"matchType": "CONTAINS", "value": "publish"},
            }},
            "orderBys": [{"metric": {"metricName": "eventCount"}, "desc": True}],
        }))
        d["publish_errors"] = extract_rows(api_call("runReport", {
            "dateRanges": rng,
            "dimensions": [{"name": "eventName"}, {"name": "customEvent:reason"}],
            "metrics": [{"name": "eventCount"}],
            "dimensionFilter": {"orGroup": {"expressions": [
                {"filter": {"fieldName": "eventName",
                            "stringFilter": {"value": "publish_error"}}},
                {"filter": {"fieldName": "eventName",
                            "stringFilter": {"value": "publish_submit_blocked"}}},
                {"filter": {"fieldName": "eventName",
                            "stringFilter": {"value": "publish_image_upload_error"}}},
            ]}},
            "limit": 20,
        }))

    # ── Search & filters ──
    if "search" in sections:
        d["search_terms"] = extract_rows(api_call("runReport", {
            "dateRanges": rng,
            "dimensions": [{"name": "customEvent:search_term"}],
            "metrics": [{"name": "eventCount"}, {"name": "totalUsers"}],
            "dimensionFilter": {"filter": {
                "fieldName": "eventName",
                "stringFilter": {"value": "search"},
            }},
            "orderBys": [{"metric": {"metricName": "eventCount"}, "desc": True}],
            "limit": 15,
        }))
        d["search_results"] = extract_rows(api_call("runReport", {
            "dateRanges": rng,
            "dimensions": [{"name": "customEvent:search_term"},
                           {"name": "customEvent:results_count"}],
            "metrics": [{"name": "eventCount"}],
            "dimensionFilter": {"filter": {
                "fieldName": "eventName",
                "stringFilter": {"value": "search"},
            }},
            "orderBys": [{"metric": {"metricName": "eventCount"}, "desc": True}],
            "limit": 30,
        }))
        d["filters"] = extract_rows(api_call("runReport", {
            "dateRanges": rng,
            "dimensions": [{"name": "customEvent:filter_key"},
                           {"name": "customEvent:filter_value"}],
            "metrics": [{"name": "eventCount"}],
            "dimensionFilter": {"filter": {
                "fieldName": "eventName",
                "stringFilter": {"matchType": "CONTAINS", "value": "filter"},
            }},
            "orderBys": [{"metric": {"metricName": "eventCount"}, "desc": True}],
            "limit": 20,
        }))
        d["shares"] = extract_rows(api_call("runReport", {
            "dateRanges": rng,
            "dimensions": [{"name": "eventName"}, {"name": "customEvent:method"}],
            "metrics": [{"name": "eventCount"}],
            "dimensionFilter": {"filter": {
                "fieldName": "eventName",
                "stringFilter": {"matchType": "CONTAINS", "value": "share"},
            }},
            "orderBys": [{"metric": {"metricName": "eventCount"}, "desc": True}],
            "limit": 10,
        }))

    # ── Engagement detail ──
    if "engagement" in sections:
        d["outbound"] = extract_rows(api_call("runReport", {
            "dateRanges": rng,
            "dimensions": [{"name": "eventName"},
                           {"name": "customEvent:link_type"}],
            "metrics": [{"name": "eventCount"}, {"name": "totalUsers"}],
            "dimensionFilter": {"filter": {
                "fieldName": "eventName",
                "stringFilter": {"value": "outbound_click"},
            }},
            "limit": 10,
        }))
        d["restaurant"] = extract_rows(api_call("runReport", {
            "dateRanges": rng,
            "dimensions": [{"name": "eventName"}],
            "metrics": [{"name": "eventCount"}, {"name": "totalUsers"}],
            "dimensionFilter": {"filter": {
                "fieldName": "eventName",
                "stringFilter": {"matchType": "CONTAINS", "value": "restaurant"},
            }},
            "orderBys": [{"metric": {"metricName": "eventCount"}, "desc": True}],
        }))
        d["calendar"] = extract_rows(api_call("runReport", {
            "dateRanges": rng,
            "dimensions": [{"name": "eventName"}, {"name": "customEvent:method"}],
            "metrics": [{"name": "eventCount"}, {"name": "totalUsers"}],
            "dimensionFilter": {"filter": {
                "fieldName": "eventName",
                "stringFilter": {"matchType": "CONTAINS", "value": "calendar"},
            }},
            "limit": 10,
        }))
        d["favorites"] = extract_rows(api_call("runReport", {
            "dateRanges": rng,
            "dimensions": [{"name": "eventName"}],
            "metrics": [{"name": "eventCount"}, {"name": "totalUsers"}],
            "dimensionFilter": {"filter": {
                "fieldName": "eventName",
                "stringFilter": {"matchType": "CONTAINS", "value": "favorite"},
            }},
            "orderBys": [{"metric": {"metricName": "eventCount"}, "desc": True}],
        }))

    # ── Compute behavior metrics ──
    if "behavior" in sections:
        d["behavior"] = compute_behavior(d)

    return d


def compute_behavior(d):
    """Derive behavior metrics from raw event data.

    Mental models applied:
    - AARRR: maps events to Acquisition → Activation → Retention → Revenue → Referral
    - North Star: "Action Rate" = % of users who outbound_click/calendar/share/favorite
    - Theory of Constraints: identifies the biggest drop-off in the funnel
    """
    events_map = {}  # event_name → {count, users}
    for dims, mets in d.get("events", []):
        events_map[dims[0]] = {"count": safe_int(mets[0]),
                               "users": safe_int(mets[1])}

    # Total users (from session_start or page_view — whichever is higher)
    total_users = max(
        events_map.get("session_start", {}).get("users", 0),
        events_map.get("page_view", {}).get("users", 0),
        1,  # avoid division by zero
    )

    # Event detail viewers (people who opened an event page)
    viewers = events_map.get("view_event_page", {}).get("users", 0)
    if not viewers:
        # Fallback: people who scrolled (implies they went deeper than listing)
        viewers = events_map.get("scroll", {}).get("users", 0)

    # Action takers (North Star)
    action_users = set()
    action_total = 0
    for ev in ACTION_EVENTS:
        ev_data = events_map.get(ev, {})
        action_total += ev_data.get("count", 0)
        action_users_count = ev_data.get("users", 0)
        # We can't get exact unique users across events via this API,
        # so we use the max single-event users as a lower bound
        if action_users_count:
            action_users.add(action_users_count)
    # Approximate unique action takers as max of individual event users
    action_taker_count = max(action_users) if action_users else 0

    # Feature adoption
    def adoption(event_name):
        return events_map.get(event_name, {}).get("users", 0) / total_users

    # Publish funnel
    pub_starts = events_map.get("publish_form_start", {}).get("count", 0)
    pub_success = events_map.get("publish_success", {}).get("count", 0)
    pub_errors = events_map.get("publish_error", {}).get("count", 0)

    # Zero-result searches
    zero_results = []
    for dims, mets in d.get("search_results", []):
        term = dims[0]
        results = dims[1] if len(dims) > 1 else ""
        if results == "0" and term != "(not set)":
            zero_results.append({"term": term, "count": safe_int(mets[0])})

    b = {
        "total_users": total_users,
        "event_viewers": viewers,
        "event_viewers_rate": viewers / total_users,
        "action_takers": action_taker_count,
        "action_count": action_total,
        "action_rate": action_taker_count / total_users,
        "view_to_action_rate": (action_taker_count / viewers) if viewers else 0,
        "adoption": {
            "search": adoption("search"),
            "filter": adoption("filter_change"),
            "load_more": adoption("load_more"),
            "outbound": adoption("outbound_click"),
            "share": adoption("share"),
            "calendar": adoption("add_to_calendar"),
            "favorite": adoption("favorite_add"),
            "restaurant_view": adoption("restaurant_section_view"),
        },
        "publish": {
            "starts": pub_starts,
            "successes": pub_success,
            "errors": pub_errors,
            "conversion": (pub_success / pub_starts) if pub_starts else 0,
        },
        "zero_result_searches": sorted(zero_results,
                                       key=lambda x: x["count"], reverse=True)[:10],
    }

    # Identify biggest bottleneck (Theory of Constraints)
    discovery_drop = 1 - b["event_viewers_rate"]
    action_drop = 1 - b["view_to_action_rate"]
    if discovery_drop > action_drop and b["event_viewers_rate"] < 0.15:
        b["bottleneck"] = "discovery"
        b["bottleneck_label"] = "Discovery → Detail"
        b["bottleneck_msg"] = (
            f"Only {b['event_viewers_rate']:.0%} of users open an event page. "
            "Improve card design, titles, and images on listing pages."
        )
    elif b["view_to_action_rate"] < 0.30:
        b["bottleneck"] = "action"
        b["bottleneck_label"] = "Detail → Action"
        b["bottleneck_msg"] = (
            f"Only {b['view_to_action_rate']:.0%} of event viewers take action. "
            "Improve CTA visibility, add sticky bar, make outbound links prominent."
        )
    else:
        b["bottleneck"] = None
        b["bottleneck_label"] = "None identified"
        b["bottleneck_msg"] = "Funnel is healthy."

    return b


def generate_actions(d):
    """Auto-generate prioritized actions from behavioral thresholds."""
    actions = []
    b = d.get("behavior", {})
    if not b:
        return actions

    ar = b["action_rate"]
    if ar > 0 and ar < 0.02:
        actions.append(("P1", "Very low action rate",
                        f"Only {ar:.1%} take action. Improve event page CTAs."))
    elif ar > 0 and ar < 0.05:
        actions.append(("P2", f"Action rate {ar:.1%} — room to grow",
                        "Test sticky CTA bar, larger buttons, better copy."))

    if b.get("bottleneck") == "discovery":
        actions.append(("P1", "Discovery bottleneck",
                        b["bottleneck_msg"]))

    zrs = b.get("zero_result_searches", [])
    if len(zrs) >= 3:
        terms = ", ".join(r["term"] for r in zrs[:5])
        actions.append(("P1", f"{len(zrs)} failed searches",
                        f"Content gaps: {terms}"))

    adopt = b.get("adoption", {})
    if adopt.get("share", 0) < 0.003 and adopt.get("calendar", 0) < 0.003:
        actions.append(("P2", "Share & Calendar nearly unused",
                        "Both <0.3% adoption. Make CTAs more prominent."))

    if adopt.get("search", 0) < 0.02 and adopt.get("search", 0) > 0:
        actions.append(("P2", "Search underused",
                        f"Only {adopt['search']:.1%} use search. Make it more prominent."))

    pub = b.get("publish", {})
    if pub.get("starts", 0) > 3 and pub.get("conversion", 1) < 0.3:
        actions.append(("P1", "Publish funnel broken",
                        f"Only {pub['conversion']:.0%} conversion. "
                        f"{pub['errors']} errors."))

    if not actions:
        actions.append(("INFO", "All metrics healthy",
                        "No critical issues. Keep monitoring."))

    return sorted(actions, key=lambda a: {"P0": 0, "P1": 1, "P2": 2, "INFO": 3}[a[0]])


# ═══════════════════════════════════════════════════════════════
# TERMINAL RENDERER
# ═══════════════════════════════════════════════════════════════

def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def render_text(d, days, sections):
    """Render collected data as terminal-friendly text."""

    if "realtime" in sections and "realtime" in d:
        section("REAL-TIME (last 30 min)")
        rows = d["realtime"]
        total = sum(safe_int(m[0]) for _, m in rows)
        print(f"\n  🟢 Active users: {total}\n")
        if rows:
            print(f"  {'Users':>5}  {'Views':>5}  Page")
            print(f"  {'─'*5}  {'─'*5}  {'─'*40}")
            for dims, mets in rows:
                print(f"  {mets[0]:>5}  {mets[1]:>5}  {dims[0][:55]}")

    if "overview" in sections and "daily" in d:
        section(f"DAILY OVERVIEW (last {days} days)")
        print(f"\n  {'Date':>10}  {'Users':>6}  {'Sessions':>8}  {'Views':>6}  {'Bounce':>7}  {'AvgDur':>7}")
        print(f"  {'─'*10}  {'─'*6}  {'─'*8}  {'─'*6}  {'─'*7}  {'─'*7}")
        tu = ts = tv = 0
        for dims, mets in d["daily"]:
            dd = dims[0]
            date_str = f"{dd[0:4]}-{dd[4:6]}-{dd[6:8]}"
            tu += safe_int(mets[0]); ts += safe_int(mets[1]); tv += safe_int(mets[2])
            print(f"  {date_str:>10}  {mets[0]:>6}  {mets[1]:>8}  {mets[2]:>6}  {fmt_bounce(mets[3]):>7}  {fmt_duration(mets[4]):>7}")
        print(f"  {'─'*10}  {'─'*6}  {'─'*8}  {'─'*6}")
        print(f"  {'TOTAL':>10}  {tu:>6}  {ts:>8}  {tv:>6}")

    if "traffic" in sections and "sources" in d:
        section(f"TRAFFIC SOURCES (last {days} days)")
        total_sess = sum(safe_int(m[0]) for _, m in d["sources"])
        print(f"\n  {'Channel':>20}  {'Sessions':>8}  {'%':>5}  {'Users':>6}  {'Views':>6}  {'Bounce':>7}")
        print(f"  {'─'*20}  {'─'*8}  {'─'*5}  {'─'*6}  {'─'*6}  {'─'*7}")
        for dims, mets in d["sources"]:
            p = f"{safe_int(mets[0])/total_sess*100:.0f}%" if total_sess else "?"
            print(f"  {dims[0]:>20}  {mets[0]:>8}  {p:>5}  {mets[1]:>6}  {mets[2]:>6}  {fmt_bounce(mets[3]):>7}")

    if "pages" in sections and "pages" in d:
        section(f"TOP PAGES (last {days} days)")
        print(f"\n  {'Views':>6}  {'Users':>6}  {'AvgDur':>7}  Page")
        print(f"  {'─'*6}  {'─'*6}  {'─'*7}  {'─'*50}")
        for dims, mets in d["pages"]:
            print(f"  {mets[0]:>6}  {mets[1]:>6}  {fmt_duration(mets[2]):>7}  {dims[0][:60]}")

    if "devices" in sections and "devices" in d:
        section(f"DEVICES & GEOGRAPHY (last {days} days)")
        print(f"\n  Devices:")
        for dims, mets in d["devices"]:
            print(f"    {dims[0]:>12}  sessions={mets[0]:>5}  users={mets[1]:>5}  views={mets[2]:>5}")
        print(f"\n  Top countries:")
        for dims, mets in d.get("countries", []):
            print(f"    {dims[0]:>20}  sessions={mets[0]:>5}  users={mets[1]:>5}")

    if "events" in sections and "events" in d:
        section(f"CUSTOM EVENTS (last {days} days)")
        print(f"\n  {'Count':>6}  {'Users':>6}  Event")
        print(f"  {'─'*6}  {'─'*6}  {'─'*35}")
        for dims, mets in d["events"]:
            marker = "" if dims[0] in AUTO_EVENTS else " ◀"
            print(f"  {mets[0]:>6}  {mets[1]:>6}  {dims[0]}{marker}")

    if "publish" in sections and "publish" in d:
        section(f"PUBLISH FUNNEL (last {days} days)")
        print(f"\n  {'Count':>6}  {'Users':>6}  Step")
        print(f"  {'─'*6}  {'─'*6}  {'─'*40}")
        for dims, mets in d["publish"]:
            print(f"  {mets[0]:>6}  {mets[1]:>6}  {dims[0]}")
        print(f"\n  Errors by reason:")
        if d.get("publish_errors"):
            for dims, mets in d["publish_errors"]:
                reason = dims[1] if dims[1] != "(not set)" else "unknown"
                print(f"    {mets[0]:>4}x  {dims[0]:35s}  reason={reason}")
        else:
            print("    (no error data)")

    if "search" in sections and "search_terms" in d:
        section(f"SEARCH & FILTERS (last {days} days)")
        print(f"\n  Top search terms:")
        if d["search_terms"]:
            for dims, mets in d["search_terms"]:
                term = dims[0] if dims[0] != "(not set)" else "—"
                print(f"    {mets[0]:>4}x  {term}")
        else:
            print("    (no search term data)")
        print(f"\n  Filter usage:")
        if d.get("filters"):
            for dims, mets in d["filters"]:
                k = dims[0] if dims[0] != "(not set)" else "—"
                v = dims[1] if dims[1] != "(not set)" else ""
                print(f"    {mets[0]:>4}x  {k}={v}")
        else:
            print("    (no filter data)")

    if "engagement" in sections and "outbound" in d:
        section(f"USER ENGAGEMENT (last {days} days)")
        print(f"\n  Outbound clicks:")
        if d["outbound"]:
            for dims, mets in d["outbound"]:
                lt = dims[1] if dims[1] != "(not set)" else "general"
                print(f"    {mets[0]:>4}x ({mets[1]:>3} users)  {lt}")
        else:
            print("    (no data)")
        print(f"\n  Restaurant promotion:")
        if d.get("restaurant"):
            for dims, mets in d["restaurant"]:
                print(f"    {mets[0]:>4}x ({mets[1]:>3} users)  {dims[0]}")
        else:
            print("    (no data)")
        print(f"\n  Add to calendar:")
        if d.get("calendar"):
            for dims, mets in d["calendar"]:
                m = dims[1] if dims[1] != "(not set)" else "—"
                print(f"    {mets[0]:>4}x ({mets[1]:>3} users)  {dims[0]}  method={m}")
        else:
            print("    (no data)")
        print(f"\n  Favorites:")
        if d.get("favorites"):
            for dims, mets in d["favorites"]:
                print(f"    {mets[0]:>4}x ({mets[1]:>3} users)  {dims[0]}")
        else:
            print("    (no data)")

    # ── Behavior summary (if computed) ──
    b = d.get("behavior")
    if b:
        section("BEHAVIOR INSIGHTS")
        print(f"\n  ⭐ North Star — Action Rate: {b['action_rate']:.1%} "
              f"({b['action_takers']} of {b['total_users']} users)")
        print(f"\n  Funnel:")
        print(f"    Landing:      {b['total_users']:>6} users")
        print(f"    → Detail:     {b['event_viewers']:>6} ({b['event_viewers_rate']:.0%})")
        print(f"    → Action:     {b['action_takers']:>6} ({b['action_rate']:.1%} of all)")
        if b.get("bottleneck"):
            print(f"\n  🔴 Bottleneck: {b['bottleneck_label']}")
            print(f"     {b['bottleneck_msg']}")
        print(f"\n  Feature adoption:")
        for name, key in [("Search", "search"), ("Filters", "filter"),
                          ("Outbound", "outbound"), ("Share", "share"),
                          ("Calendar", "calendar"), ("Favorites", "favorite"),
                          ("Restaurant", "restaurant_view")]:
            rate = b["adoption"][key]
            h = health(rate, 0.03, 0.01)
            print(f"    {h} {name:>12}: {rate:.1%}")
        zrs = b.get("zero_result_searches", [])
        if zrs:
            print(f"\n  🔍 Failed searches (0 results):")
            for r in zrs[:5]:
                print(f"    {r['count']:>4}x  {r['term']}")

    # ── Auto-generated actions ──
    actions = generate_actions(d)
    if actions:
        section("THIS WEEK'S ACTIONS")
        for pri, title, desc in actions:
            emoji = {"P0": "🚨", "P1": "🔴", "P2": "🟡", "INFO": "ℹ️"}[pri]
            print(f"\n  {emoji} [{pri}] {title}")
            print(f"     {desc}")


# ═══════════════════════════════════════════════════════════════
# MARKDOWN RENDERER (for CI / GitHub Issues)
# ═══════════════════════════════════════════════════════════════

def render_markdown(d, days):
    """Render all collected data as a Markdown document."""
    L = []  # lines
    now = datetime.now().strftime("%Y-%m-%d %H:%M")

    L.append(f"# 📊 Esdeveniments.cat — Weekly Dashboard")
    L.append(f"> Property `{PROPERTY_ID}` · Period: **last {days} days** · Generated: {now}")
    L.append("")

    # ── Health Check ──
    b = d.get("behavior", {})
    if b:
        ar = b["action_rate"]
        vr = b["event_viewers_rate"]
        h_ar = health(ar, 0.05, 0.02)
        h_vr = health(vr, 0.10, 0.05)

        L.append("## 🎯 Health Check")
        L.append("")
        L.append(f"| Metric | Value | Status |")
        L.append(f"|--------|-------|--------|")
        L.append(f"| **Users** | {b['total_users']:,} | — |")
        L.append(f"| **Event viewers** | {b['event_viewers']:,} ({b['event_viewers_rate']:.0%}) | {h_vr} |")
        L.append(f"| **Action takers** | {b['action_takers']:,} ({b['action_rate']:.1%}) | {h_ar} |")
        L.append(f"| ⭐ **Action Rate (North Star)** | **{ar:.1%}** | {h_ar} |")
        L.append("")
        if b.get("bottleneck"):
            L.append(f"> 🔴 **Bottleneck: {b['bottleneck_label']}** — {b['bottleneck_msg']}")
            L.append("")

    # ── Actions (top of page — most important) ──
    actions = generate_actions(d)
    if actions:
        L.append("## ⚠️ This Week's Actions")
        L.append("")
        for pri, title, desc in actions:
            emoji = {"P0": "🚨", "P1": "🔴", "P2": "🟡", "INFO": "ℹ️"}[pri]
            L.append(f"- {emoji} **[{pri}] {title}** — {desc}")
        L.append("")

    # ── Realtime ──
    if "realtime" in d:
        rows = d["realtime"]
        total = sum(safe_int(m[0]) for _, m in rows)
        L.append("## 🟢 Real-Time")
        L.append("")
        L.append(f"**{total} active users** right now")
        L.append("")
        if rows:
            L.append("| Users | Views | Page |")
            L.append("|------:|------:|------|")
            for dims, mets in rows[:10]:
                L.append(f"| {mets[0]} | {mets[1]} | {dims[0][:60]} |")
            L.append("")

    # ── Behavior Funnel ──
    if b:
        L.append("## 🔍 User Journey Funnel")
        L.append("")
        L.append("```")
        L.append(f"Landing ({b['total_users']:,} users)")
        L.append(f"  └─ Viewed event detail: {b['event_viewers']:,} ({b['event_viewers_rate']:.0%})")
        L.append(f"       └─ Took action: {b['action_takers']:,} ({b['view_to_action_rate']:.0%} of viewers)")
        L.append("")
        L.append(f"⭐ Action Rate = {b['action_rate']:.1%}")
        L.append(f"   (outbound_click + add_to_calendar + share + favorite_add)")
        L.append("```")
        L.append("")

        L.append("### Feature Adoption")
        L.append("")
        L.append("| Feature | % of Users | Status |")
        L.append("|---------|-----------|--------|")
        items = [
            ("Search", "search", 0.05, 0.02),
            ("Filters", "filter", 0.03, 0.01),
            ("Outbound Click", "outbound", 0.05, 0.02),
            ("Share", "share", 0.01, 0.003),
            ("Add to Calendar", "calendar", 0.01, 0.003),
            ("Favorites", "favorite", 0.01, 0.003),
            ("Restaurant Section", "restaurant_view", 0.03, 0.01),
        ]
        for name, key, good, warn in items:
            rate = b["adoption"].get(key, 0)
            h = health(rate, good, warn)
            L.append(f"| {name} | {rate:.1%} | {h} |")
        L.append("")

        zrs = b.get("zero_result_searches", [])
        if zrs:
            L.append("### 🔍 Failed Searches (0 results)")
            L.append("")
            L.append("| Term | Searches |")
            L.append("|------|-------:|")
            for r in zrs[:8]:
                L.append(f"| {r['term']} | {r['count']} |")
            L.append("")

    # ── Daily Overview ──
    if "daily" in d:
        L.append("## 📈 Daily Overview")
        L.append("")
        L.append("| Date | Users | Sessions | Views | Bounce | Avg Duration |")
        L.append("|------|------:|---------:|------:|-------:|-------------:|")
        tu = ts = tv = 0
        for dims, mets in d["daily"]:
            dd = dims[0]
            ds = f"{dd[0:4]}-{dd[4:6]}-{dd[6:8]}"
            tu += safe_int(mets[0]); ts += safe_int(mets[1]); tv += safe_int(mets[2])
            L.append(f"| {ds} | {mets[0]} | {mets[1]} | {mets[2]} | {fmt_bounce(mets[3])} | {fmt_duration(mets[4])} |")
        L.append(f"| **Total** | **{tu:,}** | **{ts:,}** | **{tv:,}** | | |")
        L.append("")

    # ── Traffic Sources ──
    if "sources" in d:
        total_sess = sum(safe_int(m[0]) for _, m in d["sources"])
        L.append("## 🌐 Traffic Sources")
        L.append("")
        L.append("| Channel | Sessions | % | Users | Views | Bounce |")
        L.append("|---------|--------:|--:|------:|------:|-------:|")
        for dims, mets in d["sources"]:
            p = f"{safe_int(mets[0])/total_sess*100:.0f}%" if total_sess else "?"
            L.append(f"| {dims[0]} | {mets[0]} | {p} | {mets[1]} | {mets[2]} | {fmt_bounce(mets[3])} |")
        L.append("")

    # ── Top Pages ──
    if "pages" in d:
        L.append("## 📄 Top Pages")
        L.append("")
        L.append("| Views | Users | Avg Duration | Page |")
        L.append("|------:|------:|-------------:|------|")
        for dims, mets in d["pages"][:15]:
            L.append(f"| {mets[0]} | {mets[1]} | {fmt_duration(mets[2])} | `{dims[0][:50]}` |")
        L.append("")

    # ── Devices ──
    if "devices" in d:
        L.append("## 📱 Devices & Geography")
        L.append("")
        L.append("| Device | Sessions | Users | Views |")
        L.append("|--------|--------:|------:|------:|")
        for dims, mets in d["devices"]:
            L.append(f"| {dims[0]} | {mets[0]} | {mets[1]} | {mets[2]} |")
        L.append("")
        if d.get("countries"):
            L.append("| Country | Sessions | Users |")
            L.append("|---------|--------:|------:|")
            for dims, mets in d["countries"]:
                L.append(f"| {dims[0]} | {mets[0]} | {mets[1]} |")
            L.append("")

    # ── Publish Funnel ──
    if "publish" in d:
        L.append("## 📝 Publish Funnel")
        L.append("")
        pub = b.get("publish", {}) if b else {}
        if pub.get("starts", 0) > 0:
            L.append(f"Form starts: **{pub['starts']}** → "
                     f"Successes: **{pub['successes']}** "
                     f"(conversion: **{pub['conversion']:.0%}**)")
            if pub["errors"] > 0:
                L.append(f"⚠️ {pub['errors']} errors")
            L.append("")
        L.append("| Count | Users | Step |")
        L.append("|------:|------:|------|")
        for dims, mets in d["publish"]:
            L.append(f"| {mets[0]} | {mets[1]} | {dims[0]} |")
        L.append("")
        if d.get("publish_errors"):
            L.append("**Errors by reason:**")
            L.append("")
            L.append("| Count | Event | Reason |")
            L.append("|------:|-------|--------|")
            for dims, mets in d["publish_errors"]:
                reason = dims[1] if dims[1] != "(not set)" else "unknown"
                L.append(f"| {mets[0]} | {dims[0]} | {reason} |")
            L.append("")

    # ── Search & Filters ──
    if "search_terms" in d:
        L.append("## 🔎 Search & Filters")
        L.append("")
        if d["search_terms"]:
            L.append("**Top search terms:**")
            L.append("")
            L.append("| Term | Searches | Users |")
            L.append("|------|--------:|------:|")
            for dims, mets in d["search_terms"]:
                term = dims[0] if dims[0] != "(not set)" else "—"
                users = mets[1] if len(mets) > 1 else "—"
                L.append(f"| {term} | {mets[0]} | {users} |")
            L.append("")
        if d.get("filters"):
            L.append("**Filter usage:**")
            L.append("")
            L.append("| Count | Filter | Value |")
            L.append("|------:|--------|-------|")
            for dims, mets in d["filters"]:
                k = dims[0] if dims[0] != "(not set)" else "—"
                v = dims[1] if dims[1] != "(not set)" else ""
                L.append(f"| {mets[0]} | {k} | {v} |")
            L.append("")

    # ── Engagement ──
    if "outbound" in d:
        L.append("## 🎯 Engagement Detail")
        L.append("")
        if d["outbound"]:
            L.append("**Outbound clicks:**")
            L.append("")
            L.append("| Count | Users | Type |")
            L.append("|------:|------:|------|")
            for dims, mets in d["outbound"]:
                lt = dims[1] if dims[1] != "(not set)" else "general"
                L.append(f"| {mets[0]} | {mets[1]} | {lt} |")
            L.append("")
        if d.get("restaurant"):
            L.append("**Restaurant promotion:**")
            L.append("")
            for dims, mets in d["restaurant"]:
                L.append(f"- {dims[0]}: **{mets[0]}** events ({mets[1]} users)")
            L.append("")
        if d.get("calendar"):
            L.append("**Add to calendar:**")
            L.append("")
            for dims, mets in d["calendar"]:
                m = dims[1] if dims[1] != "(not set)" else "—"
                L.append(f"- {dims[0]}: **{mets[0]}** ({mets[1]} users, method: {m})")
            L.append("")
        if d.get("favorites"):
            L.append("**Favorites:**")
            L.append("")
            for dims, mets in d["favorites"]:
                L.append(f"- {dims[0]}: **{mets[0]}** ({mets[1]} users)")
            L.append("")

    # ── Custom Events (raw, collapsed) ──
    if "events" in d:
        L.append("<details>")
        L.append("<summary>📋 All Custom Events (click to expand)</summary>")
        L.append("")
        L.append("| Count | Users | Event |")
        L.append("|------:|------:|-------|")
        for dims, mets in d["events"]:
            if dims[0] not in AUTO_EVENTS:
                L.append(f"| {mets[0]} | {mets[1]} | {dims[0]} |")
        L.append("")
        L.append("</details>")
        L.append("")

    L.append("---")
    L.append(f"*Generated by `ga-dashboard.py` on {now}*")
    return "\n".join(L)


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

def main():
    args = set(sys.argv[1:])
    days = 7
    if "--days" in args:
        idx = sys.argv.index("--days")
        if idx + 1 < len(sys.argv):
            days = int(sys.argv[idx + 1])

    is_md = "--md" in args
    show_all = "--all" in args or is_md
    no_flags = not (args - {"--days", str(days)})

    # Determine which sections to collect
    sections = set()

    if show_all:
        sections = {"realtime", "overview", "traffic", "pages", "devices",
                    "events", "publish", "search", "engagement", "behavior"}
    elif no_flags:
        # Quick overview: core sections + behavior (most important)
        sections = {"realtime", "overview", "traffic", "pages", "behavior",
                    "events"}
    else:
        if "--realtime" in args:
            sections.add("realtime")
        if "--events" in args:
            sections.add("events")
        if "--publish" in args:
            sections.add("publish")
        if "--search" in args:
            sections.add("search")
        if "--engagement" in args:
            sections.add("engagement")

    # Always need events data for behavior computation
    if "behavior" in sections:
        sections.add("events")
        sections.add("search")  # needed for zero-result searches

    # Collect all data in one pass
    if not is_md:
        print(f"\n  📊 Esdeveniments.cat — GA4 Dashboard")
        print(f"  Property: {PROPERTY_ID} | Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        print(f"  Period: last {days} days")

    d = collect_data(days, sections)

    if is_md:
        print(render_markdown(d, days))
    else:
        render_text(d, days, sections)
        print(f"\n{'='*60}")
        print(f"  Done.{' Run with --all for complete dashboard.' if not show_all else ''}")
        print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
