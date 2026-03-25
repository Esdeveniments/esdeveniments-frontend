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
    python3 scripts/ga-dashboard.py --country Spain  # Filter to one country (removes bots)
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

# Day names for temporal analysis
DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


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


def with_country_filter(existing_filter, country):
    """Wrap an existing dimensionFilter with an AND(country=X, existing).

    If country is None, returns the existing filter unchanged.
    If there's no existing filter, returns just the country filter.
    If there IS an existing filter, wraps both in an andGroup.
    """
    if not country:
        return existing_filter
    country_expr = {"filter": {
        "fieldName": "country",
        "stringFilter": {"value": country},
    }}
    if not existing_filter:
        return country_expr
    # Wrap both in andGroup
    return {"andGroup": {"expressions": [country_expr, existing_filter]}}


# ═══════════════════════════════════════════════════════════════
# DATA COLLECTION (single pass — all API calls happen here)
# ═══════════════════════════════════════════════════════════════

def collect_data(days, sections, country=None):
    """Fetch all needed GA4 data into a structured dict.

    If country is set (e.g. 'Spain'), all runReport calls are filtered
    to that country. Realtime reports are unfiltered (API limitation).
    """
    d = {}
    d["country_filter"] = country
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
            "dimensionFilter": with_country_filter(None, country),
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
            "dimensionFilter": with_country_filter(None, country),
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
            "dimensionFilter": with_country_filter(None, country),
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
            "dimensionFilter": with_country_filter(None, country),
            "orderBys": [{"metric": {"metricName": "sessions"}, "desc": True}],
        }))
        # Country breakdown — always unfiltered (shows where users come from)
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
            "dimensionFilter": with_country_filter(None, country),
            "orderBys": [{"metric": {"metricName": "eventCount"}, "desc": True}],
            "limit": 50,
        }))

    # ── Publish funnel ──
    if "publish" in sections:
        publish_filter = {"filter": {
            "fieldName": "eventName",
            "stringFilter": {"matchType": "CONTAINS", "value": "publish"},
        }}
        d["publish"] = extract_rows(api_call("runReport", {
            "dateRanges": rng,
            "dimensions": [{"name": "eventName"}],
            "metrics": [{"name": "eventCount"}, {"name": "totalUsers"}],
            "dimensionFilter": with_country_filter(publish_filter, country),
            "orderBys": [{"metric": {"metricName": "eventCount"}, "desc": True}],
        }))
        errors_filter = {"orGroup": {"expressions": [
            {"filter": {"fieldName": "eventName",
                        "stringFilter": {"value": "publish_error"}}},
            {"filter": {"fieldName": "eventName",
                        "stringFilter": {"value": "publish_submit_blocked"}}},
            {"filter": {"fieldName": "eventName",
                        "stringFilter": {"value": "publish_image_upload_error"}}},
        ]}}
        d["publish_errors"] = extract_rows(api_call("runReport", {
            "dateRanges": rng,
            "dimensions": [{"name": "eventName"}, {"name": "customEvent:reason"}],
            "metrics": [{"name": "eventCount"}],
            "dimensionFilter": with_country_filter(errors_filter, country),
            "limit": 20,
        }))

    # ── Search & filters ──
    if "search" in sections:
        search_filter = {"filter": {
            "fieldName": "eventName",
            "stringFilter": {"value": "search"},
        }}
        d["search_terms"] = extract_rows(api_call("runReport", {
            "dateRanges": rng,
            "dimensions": [{"name": "customEvent:search_term"}],
            "metrics": [{"name": "eventCount"}, {"name": "totalUsers"}],
            "dimensionFilter": with_country_filter(search_filter, country),
            "orderBys": [{"metric": {"metricName": "eventCount"}, "desc": True}],
            "limit": 15,
        }))
        d["search_results"] = extract_rows(api_call("runReport", {
            "dateRanges": rng,
            "dimensions": [{"name": "customEvent:search_term"},
                           {"name": "customEvent:results_count"}],
            "metrics": [{"name": "eventCount"}],
            "dimensionFilter": with_country_filter(search_filter, country),
            "orderBys": [{"metric": {"metricName": "eventCount"}, "desc": True}],
            "limit": 30,
        }))
        filter_filter = {"filter": {
            "fieldName": "eventName",
            "stringFilter": {"matchType": "CONTAINS", "value": "filter"},
        }}
        d["filters"] = extract_rows(api_call("runReport", {
            "dateRanges": rng,
            "dimensions": [{"name": "customEvent:filter_key"},
                           {"name": "customEvent:filter_value"}],
            "metrics": [{"name": "eventCount"}],
            "dimensionFilter": with_country_filter(filter_filter, country),
            "orderBys": [{"metric": {"metricName": "eventCount"}, "desc": True}],
            "limit": 20,
        }))
        share_filter = {"filter": {
            "fieldName": "eventName",
            "stringFilter": {"matchType": "CONTAINS", "value": "share"},
        }}
        d["shares"] = extract_rows(api_call("runReport", {
            "dateRanges": rng,
            "dimensions": [{"name": "eventName"}, {"name": "customEvent:method"}],
            "metrics": [{"name": "eventCount"}],
            "dimensionFilter": with_country_filter(share_filter, country),
            "orderBys": [{"metric": {"metricName": "eventCount"}, "desc": True}],
            "limit": 10,
        }))

    # ── Engagement detail ──
    if "engagement" in sections:
        outbound_filter = {"filter": {
            "fieldName": "eventName",
            "stringFilter": {"value": "outbound_click"},
        }}
        d["outbound"] = extract_rows(api_call("runReport", {
            "dateRanges": rng,
            "dimensions": [{"name": "eventName"},
                           {"name": "customEvent:link_type"}],
            "metrics": [{"name": "eventCount"}, {"name": "totalUsers"}],
            "dimensionFilter": with_country_filter(outbound_filter, country),
            "limit": 10,
        }))
        restaurant_filter = {"filter": {
            "fieldName": "eventName",
            "stringFilter": {"matchType": "CONTAINS", "value": "restaurant"},
        }}
        d["restaurant"] = extract_rows(api_call("runReport", {
            "dateRanges": rng,
            "dimensions": [{"name": "eventName"}],
            "metrics": [{"name": "eventCount"}, {"name": "totalUsers"}],
            "dimensionFilter": with_country_filter(restaurant_filter, country),
            "orderBys": [{"metric": {"metricName": "eventCount"}, "desc": True}],
        }))
        calendar_filter = {"filter": {
            "fieldName": "eventName",
            "stringFilter": {"matchType": "CONTAINS", "value": "calendar"},
        }}
        d["calendar"] = extract_rows(api_call("runReport", {
            "dateRanges": rng,
            "dimensions": [{"name": "eventName"}, {"name": "customEvent:method"}],
            "metrics": [{"name": "eventCount"}, {"name": "totalUsers"}],
            "dimensionFilter": with_country_filter(calendar_filter, country),
            "limit": 10,
        }))
        fav_filter = {"filter": {
            "fieldName": "eventName",
            "stringFilter": {"matchType": "CONTAINS", "value": "favorite"},
        }}
        d["favorites"] = extract_rows(api_call("runReport", {
            "dateRanges": rng,
            "dimensions": [{"name": "eventName"}],
            "metrics": [{"name": "eventCount"}, {"name": "totalUsers"}],
            "dimensionFilter": with_country_filter(fav_filter, country),
            "orderBys": [{"metric": {"metricName": "eventCount"}, "desc": True}],
        }))

    # ── Pareto: outbound clicks by page (which pages convert?) ──
    if "behavior" in sections:
        outbound_page_filter = {"filter": {
            "fieldName": "eventName",
            "stringFilter": {"value": "outbound_click"},
        }}
        d["outbound_by_page"] = extract_rows(api_call("runReport", {
            "dateRanges": rng,
            "dimensions": [{"name": "pagePath"}],
            "metrics": [{"name": "eventCount"}, {"name": "totalUsers"}],
            "dimensionFilter": with_country_filter(outbound_page_filter, country),
            "orderBys": [{"metric": {"metricName": "eventCount"}, "desc": True}],
            "limit": 20,
        }))
        # Page views per page (to compute conversion rate)
        event_page_filter = {"filter": {
            "fieldName": "pagePath",
            "stringFilter": {"matchType": "BEGINS_WITH", "value": "/e/"},
        }}
        d["views_by_page"] = extract_rows(api_call("runReport", {
            "dateRanges": rng,
            "dimensions": [{"name": "pagePath"}],
            "metrics": [{"name": "screenPageViews"}],
            "dimensionFilter": with_country_filter(event_page_filter, country),
            "orderBys": [{"metric": {"metricName": "screenPageViews"}, "desc": True}],
            "limit": 50,
        }))

        # Section visibility breakdown (which detail page sections do users see?)
        section_view_filter = {"filter": {
            "fieldName": "eventName",
            "stringFilter": {"value": "section_view"},
        }}
        d["section_views"] = extract_rows(api_call("runReport", {
            "dateRanges": rng,
            "dimensions": [{"name": "customEvent:section"}],
            "metrics": [{"name": "eventCount"}, {"name": "totalUsers"}],
            "dimensionFilter": with_country_filter(section_view_filter, country),
            "orderBys": [{"metric": {"metricName": "totalUsers"}, "desc": True}],
            "limit": 20,
        }))

        # Listing scroll depth distribution
        scroll_depth_filter = {"filter": {
            "fieldName": "eventName",
            "stringFilter": {"value": "listing_scroll_depth"},
        }}
        d["scroll_depth"] = extract_rows(api_call("runReport", {
            "dateRanges": rng,
            "dimensions": [{"name": "customEvent:depth"}],
            "metrics": [{"name": "eventCount"}, {"name": "totalUsers"}],
            "dimensionFilter": with_country_filter(scroll_depth_filter, country),
            "limit": 10,
        }))
        # Sort numerically (GA4 returns strings, so "100" < "25" lexically)
        d["scroll_depth"].sort(key=lambda r: int(r[0]) if r[0].isdigit() else 0)

    # ── Compute behavior metrics ──
    if "behavior" in sections:
        d["behavior"] = compute_behavior(d, days)

    return d


def compute_behavior(d, days):
    """Derive behavior metrics from raw event data.

    Mental models applied:
    - AARRR: maps events to Acquisition → Activation → Retention → Revenue → Referral
    - North Star: "Action Rate" = % of users who outbound_click/calendar/share/favorite
    - Theory of Constraints: identifies the biggest drop-off in the funnel
    - Pareto (80/20): which pages drive most outbound clicks?
    - Temporal patterns: which days drive engagement?
    - Content-Market Fit: search demand vs content supply
    - Fogg Behavior Model: categorizes triggers strength
    - Opportunity Sizing: estimates impact of improvements
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
            "section_view": adoption("section_view"),
            "card_impression": adoption("card_impression_batch"),
            "zero_results": adoption("zero_results"),
            "favorites_page": adoption("favorites_page_view"),
            "pwa_installed": adoption("pwa_installed"),
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

    # ── Temporal patterns (day-of-week from daily data) ──
    dow_data = {}  # day_index → {users, sessions, views}
    for dims, mets in d.get("daily", []):
        dd = dims[0]
        try:
            dt = datetime(int(dd[:4]), int(dd[4:6]), int(dd[6:8]))
            day_idx = dt.weekday()  # 0=Mon, 6=Sun
            if day_idx not in dow_data:
                dow_data[day_idx] = {"users": 0, "sessions": 0, "views": 0,
                                     "count": 0}
            dow_data[day_idx]["users"] += safe_int(mets[0])
            dow_data[day_idx]["sessions"] += safe_int(mets[1])
            dow_data[day_idx]["views"] += safe_int(mets[2])
            dow_data[day_idx]["count"] += 1
        except (ValueError, IndexError):
            pass

    # Average per day-of-week
    temporal = []
    for idx in range(7):
        dd = dow_data.get(idx)
        if dd and dd["count"] > 0:
            temporal.append({
                "day": DAY_NAMES[idx],
                "day_idx": idx,
                "avg_users": round(dd["users"] / dd["count"]),
                "avg_sessions": round(dd["sessions"] / dd["count"]),
                "avg_views": round(dd["views"] / dd["count"]),
                "total_users": dd["users"],
            })
    b["temporal"] = temporal

    # Peak discovery day
    if temporal:
        peak = max(temporal, key=lambda x: x["avg_users"])
        valley = min(temporal, key=lambda x: x["avg_users"])
        b["peak_day"] = peak["day"]
        b["peak_users"] = peak["avg_users"]
        b["valley_day"] = valley["day"]
        b["valley_users"] = valley["avg_users"]
        # Weekend vs weekday ratio
        wkday = [t for t in temporal if t["day_idx"] < 5]
        wkend = [t for t in temporal if t["day_idx"] >= 5]
        avg_wkday = (sum(t["avg_users"] for t in wkday) / len(wkday)) if wkday else 0
        avg_wkend = (sum(t["avg_users"] for t in wkend) / len(wkend)) if wkend else 0
        b["weekday_avg"] = round(avg_wkday)
        b["weekend_avg"] = round(avg_wkend)

    # ── Pareto analysis (which pages drive outbound clicks?) ──
    views_map = {}  # pagePath → views
    for dims, mets in d.get("views_by_page", []):
        views_map[dims[0]] = safe_int(mets[0])

    pareto_pages = []
    total_outbound = 0
    for dims, mets in d.get("outbound_by_page", []):
        page = dims[0]
        clicks = safe_int(mets[0])
        users = safe_int(mets[1])
        total_outbound += clicks
        page_views = views_map.get(page, 0)
        pareto_pages.append({
            "page": page,
            "clicks": clicks,
            "users": users,
            "views": page_views,
            "conversion": (clicks / page_views) if page_views > 0 else 0,
        })

    # Calculate cumulative % for Pareto
    running_total = 0
    for p in pareto_pages:
        running_total += p["clicks"]
        p["cum_pct"] = (running_total / total_outbound) if total_outbound else 0

    b["pareto"] = pareto_pages[:15]
    b["total_outbound_clicks"] = total_outbound
    # How many pages drive 80% of outbound clicks?
    pages_for_80 = sum(1 for p in pareto_pages if p["cum_pct"] <= 0.80) + 1
    b["pareto_80_pages"] = min(pages_for_80, len(pareto_pages))

    # ── Content-Market Fit (search demand vs results) ──
    search_demand = []
    for dims, mets in d.get("search_results", []):
        term = dims[0]
        results_str = dims[1] if len(dims) > 1 else ""
        if term == "(not set)":
            continue
        results = safe_int(results_str)
        count = safe_int(mets[0])
        search_demand.append({"term": term, "results": results,
                              "searches": count})

    # Aggregate by term (may have multiple result counts)
    term_demand = {}
    for s in search_demand:
        t = s["term"]
        if t not in term_demand:
            term_demand[t] = {"term": t, "total_searches": 0,
                              "max_results": 0, "min_results": 999999}
        term_demand[t]["total_searches"] += s["searches"]
        term_demand[t]["max_results"] = max(term_demand[t]["max_results"],
                                            s["results"])
        term_demand[t]["min_results"] = min(term_demand[t]["min_results"],
                                            s["results"])

    # Classify: High demand + low results = content gap
    content_fit = []
    for t, info in sorted(term_demand.items(),
                          key=lambda x: x[1]["total_searches"], reverse=True):
        if info["max_results"] == 0:
            fit = "🔴 GAP"
        elif info["max_results"] < 5:
            fit = "🟡 THIN"
        else:
            fit = "🟢 OK"
        content_fit.append({
            "term": t,
            "searches": info["total_searches"],
            "results": info["max_results"],
            "fit": fit,
        })
    b["content_fit"] = content_fit[:15]

    # ── Opportunity sizing (Fogg: Trigger strength analysis) ──
    # How many users saw a trigger vs acted on it?
    triggers = {}
    # Sticky CTA = trigger on event page
    sticky_views = events_map.get("view_event_page", {}).get("users", 0)
    sticky_clicks = events_map.get("sticky_cta_click", {}).get("users", 0)
    if sticky_views > 0:
        triggers["Sticky CTA"] = {
            "exposed": sticky_views,
            "acted": sticky_clicks,
            "rate": sticky_clicks / sticky_views,
        }
    # Calendar view trigger
    cal_views = events_map.get("add_to_calendar_view", {}).get("users", 0)
    cal_clicks = events_map.get("add_to_calendar", {}).get("users", 0)
    if cal_views > 0:
        triggers["Calendar popup"] = {
            "exposed": cal_views,
            "acted": cal_clicks,
            "rate": cal_clicks / cal_views,
        }
    # Restaurant section as trigger for maps/website clicks
    rest_views = events_map.get("restaurant_section_view", {}).get("users", 0)
    maps_clicks = events_map.get("outbound_click", {}).get("users", 0)
    # Approximate: restaurant is one source of outbound
    if rest_views > 0:
        triggers["Restaurant section"] = {
            "exposed": rest_views,
            "acted": maps_clicks,
            "rate": maps_clicks / rest_views if rest_views > 0 else 0,
        }
    b["triggers"] = triggers

    # ── Opportunity sizing (estimated impact) ──
    # If we improve discovery rate from current to target, how many more actions?
    current_viewer_rate = b["event_viewers_rate"]
    current_action_rate_on_viewers = b["view_to_action_rate"]
    target_viewer_rate = max(current_viewer_rate, 0.10)  # target: 10% minimum
    target_action_rate = max(current_action_rate_on_viewers, 0.20)  # 20% of viewers

    daily_users = total_users / max(days, 1)
    current_daily_actions = daily_users * current_viewer_rate * current_action_rate_on_viewers
    improved_discovery_actions = daily_users * target_viewer_rate * current_action_rate_on_viewers
    improved_both_actions = daily_users * target_viewer_rate * target_action_rate

    b["opportunity"] = {
        "daily_users": round(daily_users),
        "current_daily_actions": round(current_daily_actions, 1),
        "if_improve_discovery": round(improved_discovery_actions, 1),
        "if_improve_both": round(improved_both_actions, 1),
        "discovery_gain_monthly": round((improved_discovery_actions - current_daily_actions) * 30),
        "both_gain_monthly": round((improved_both_actions - current_daily_actions) * 30),
    }

    return b


def generate_actions(d):
    """Auto-generate prioritized actions from behavioral thresholds.

    Includes opportunity sizing (estimated monthly impact) where possible.
    """
    actions = []
    b = d.get("behavior", {})
    if not b:
        return actions

    opp = b.get("opportunity", {})

    ar = b["action_rate"]
    if ar > 0 and ar < 0.02:
        gain = opp.get("both_gain_monthly", 0)
        actions.append(("P1", "Very low action rate",
                        f"Only {ar:.1%} take action. Improve event page CTAs. "
                        f"Potential: +{gain} actions/month if fixed."))
    elif ar > 0 and ar < 0.05:
        gain = opp.get("discovery_gain_monthly", 0)
        actions.append(("P2", f"Action rate {ar:.1%} — room to grow",
                        f"Test sticky CTA bar, larger buttons. "
                        f"Potential: +{gain} actions/month."))

    if b.get("bottleneck") == "discovery":
        gain = opp.get("discovery_gain_monthly", 0)
        actions.append(("P1", "Discovery bottleneck",
                        f"{b['bottleneck_msg']} "
                        f"Fixing this → +{gain} actions/month."))

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
                        f"Only {adopt['search']:.1%} use search. "
                        "Make it more prominent."))

    pub = b.get("publish", {})
    if pub.get("starts", 0) > 3 and pub.get("conversion", 1) < 0.3:
        actions.append(("P1", "Publish funnel broken",
                        f"Only {pub['conversion']:.0%} conversion. "
                        f"{pub['errors']} errors."))

    # Content-market fit gaps with high demand
    gaps = [c for c in b.get("content_fit", [])
            if c["fit"].startswith("🔴") and c["searches"] >= 3]
    if gaps:
        terms = ", ".join(g["term"] for g in gaps[:3])
        actions.append(("P2", f"{len(gaps)} high-demand content gaps",
                        f"Users search for {terms} but find 0 results. "
                        "Add events or improve search."))

    # Temporal: suggest best days for social pushing
    if b.get("peak_day") and b.get("valley_day"):
        if b["peak_users"] > b["valley_users"] * 1.5:
            actions.append(("INFO", f"Best day: {b['peak_day']} "
                           f"({b['peak_users']} users avg)",
                           f"Worst: {b['valley_day']} ({b['valley_users']}). "
                           "Time social posts and email digests for peak days."))

    # Pareto insight
    if b.get("pareto_80_pages", 0) > 0 and b.get("total_outbound_clicks", 0) > 5:
        n = b["pareto_80_pages"]
        total = len(b.get("pareto", []))
        actions.append(("INFO", f"Pareto: {n} of {total} pages drive 80% of outbound",
                        "Focus CTA optimization on these high-converting pages first."))

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
                          ("Restaurant", "restaurant_view"),
                          ("Sections", "section_view"),
                          ("Card Impr.", "card_impression"),
                          ("Favs Page", "favorites_page")]:
            rate = b["adoption"][key]
            h = health(rate, 0.03, 0.01)
            print(f"    {h} {name:>12}: {rate:.1%}")
        zrs = b.get("zero_result_searches", [])
        if zrs:
            print(f"\n  🔍 Failed searches (0 results):")
            for r in zrs[:5]:
                print(f"    {r['count']:>4}x  {r['term']}")

        # ── Section Visibility (detail page) ──
        sv = d.get("section_views", [])
        if sv:
            print(f"\n  📐 Detail Page Section Visibility:")
            print(f"    {'Users':>6}  {'Events':>6}  Section")
            print(f"    {'─'*6}  {'─'*6}  {'─'*20}")
            for dims, mets in sv:
                print(f"    {safe_int(mets[1]):>6}  {safe_int(mets[0]):>6}  {dims[0]}")

        # ── Listing Scroll Depth ──
        sd = d.get("scroll_depth", [])
        if sd:
            print(f"\n  📏 Listing Scroll Depth:")
            print(f"    {'Users':>6}  {'Events':>6}  Depth")
            print(f"    {'─'*6}  {'─'*6}  {'─'*8}")
            for dims, mets in sd:
                print(f"    {safe_int(mets[1]):>6}  {safe_int(mets[0]):>6}  {dims[0]}%")

        # ── Temporal Patterns ──
        temporal = b.get("temporal", [])
        if temporal:
            print(f"\n  📅 Day-of-Week Patterns:")
            print(f"    {'Day':>5}  {'Avg Users':>10}  {'Avg Views':>10}")
            print(f"    {'─'*5}  {'─'*10}  {'─'*10}")
            for t in temporal:
                print(f"    {t['day']:>5}  {t['avg_users']:>10.0f}  {t['avg_views']:>10.0f}")
            if b.get("peak_day"):
                print(f"\n    Peak: {b['peak_day']} ({b['peak_users']:.0f} avg users)")
                print(f"    Valley: {b['valley_day']} ({b['valley_users']:.0f} avg users)")
            we = b.get("weekend_avg", 0)
            wd = b.get("weekday_avg", 0)
            if wd:
                ratio = we / wd
                lbl = "more" if ratio >= 1 else "fewer"
                print(f"    Weekend vs weekday: {ratio:.1f}x ({lbl} on weekends)")

        # ── Pareto Analysis ──
        pareto = b.get("pareto", [])
        if pareto:
            print(f"\n  📊 Pareto: Page Conversion (outbound clicks / views)")
            print(f"    {'Clicks':>6}  {'Views':>6}  {'Conv%':>6}  {'Cum%':>5}  Page")
            print(f"    {'─'*6}  {'─'*6}  {'─'*6}  {'─'*5}  {'─'*40}")
            for p in pareto[:10]:
                print(f"    {p['clicks']:>6}  {p['views']:>6}  "
                      f"{p['conversion']:.1%}  {p['cum_pct']*100:.0f}%  {p['page'][:50]}")
            n80 = b.get("pareto_80_pages", 0)
            total_click = b.get("total_outbound_clicks", 0)
            if n80:
                print(f"\n    → {n80} pages drive 80% of outbound "
                      f"({total_click} total clicks)")

        # ── Content-Market Fit ──
        fits = b.get("content_fit", [])
        if fits:
            print(f"\n  🎯 Content-Market Fit (search demand vs results)")
            print(f"    {'Searches':>8}  {'Results':>8}  {'Fit':>6}  Term")
            print(f"    {'─'*8}  {'─'*8}  {'─'*6}  {'─'*30}")
            for f in fits[:10]:
                print(f"    {f['searches']:>8}  {f['results']:>8}  "
                      f"{f['fit']:>6}  {f['term']}")

        # ── Fogg Trigger Analysis ──
        triggers = b.get("triggers", {})
        if triggers:
            print(f"\n  🔔 Trigger Effectiveness (Fogg Model)")
            print(f"    {'Exposed':>8}  {'Acted':>8}  {'Rate':>7}  Trigger")
            print(f"    {'─'*8}  {'─'*8}  {'─'*7}  {'─'*30}")
            for name, t in triggers.items():
                print(f"    {t['exposed']:>8}  {t['acted']:>8}  "
                      f"{t['rate']:.1%}  {name}")

        # ── Opportunity Sizing ──
        opp = b.get("opportunity", {})
        if opp and opp.get("daily_users", 0) > 0:
            print(f"\n  💰 Opportunity Sizing (estimated monthly impact)")
            print(f"    Current: ~{opp['current_daily_actions']:.0f} actions/day")
            if opp.get("discovery_gain_monthly", 0) > 0:
                print(f"    If discovery rate → 10%: "
                      f"+{opp['discovery_gain_monthly']} actions/month")
            if opp.get("both_gain_monthly", 0) > 0:
                print(f"    If both discovery+action improve: "
                      f"+{opp['both_gain_monthly']} actions/month")

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
    country = d.get("country_filter")
    filter_note = f" · Country: **{country}**" if country else ""
    L.append(f"> Property `{PROPERTY_ID}` · Period: **last {days} days**{filter_note} · Generated: {now}")
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
            ("Section Views", "section_view", 0.05, 0.02),
            ("Card Impressions", "card_impression", 0.10, 0.05),
            ("Favorites Page", "favorites_page", 0.01, 0.003),
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

        # ── Section Visibility ──
        sv = d.get("section_views", [])
        if sv:
            L.append("### 📐 Detail Page Section Visibility")
            L.append("")
            L.append("| Section | Users | Events |")
            L.append("|---------|------:|-------:|")
            for dims, mets in sv:
                L.append(f"| {dims[0]} | {safe_int(mets[1])} | {safe_int(mets[0])} |")
            L.append("")

        # ── Listing Scroll Depth ──
        sd = d.get("scroll_depth", [])
        if sd:
            L.append("### 📏 Listing Scroll Depth")
            L.append("")
            L.append("| Depth | Users | Events |")
            L.append("|------:|------:|-------:|")
            for dims, mets in sd:
                L.append(f"| {dims[0]}% | {safe_int(mets[1])} | {safe_int(mets[0])} |")
            L.append("")

        # ── Temporal Patterns ──
        temporal = b.get("temporal", [])
        if temporal:
            L.append("### 📅 Day-of-Week Patterns")
            L.append("")
            L.append("| Day | Avg Users | Avg Views |")
            L.append("|-----|----------:|----------:|")
            for t in temporal:
                L.append(f"| {t['day']} | {t['avg_users']:.0f} | {t['avg_views']:.0f} |")
            L.append("")
            if b.get("peak_day"):
                we = b.get("weekend_avg", 0)
                wd = b.get("weekday_avg", 0)
                ratio_str = ""
                if wd:
                    ratio = we / wd
                    lbl = "more" if ratio >= 1 else "fewer"
                    ratio_str = f" Weekend is {ratio:.1f}x ({lbl} than weekday)."
                L.append(f"> 📈 **Peak**: {b['peak_day']} "
                         f"({b['peak_users']:.0f} avg users) · "
                         f"**Valley**: {b['valley_day']} "
                         f"({b['valley_users']:.0f} avg users).{ratio_str}")
                L.append("")

        # ── Pareto Analysis ──
        pareto = b.get("pareto", [])
        if pareto:
            n80 = b.get("pareto_80_pages", 0)
            total_click = b.get("total_outbound_clicks", 0)
            L.append("### 📊 Pareto: Page Conversion")
            L.append("")
            if n80:
                L.append(f"> **{n80} pages** drive 80% of outbound clicks "
                         f"({total_click} total).")
                L.append("")
            L.append("| Clicks | Views | Conv % | Cum % | Page |")
            L.append("|-------:|------:|-------:|------:|------|")
            for p in pareto[:10]:
                L.append(f"| {p['clicks']} | {p['views']} | "
                         f"{p['conversion']:.1%} | {p['cum_pct']*100:.0f}% | "
                         f"`{p['page'][:50]}` |")
            L.append("")

        # ── Content-Market Fit ──
        fits = b.get("content_fit", [])
        if fits:
            L.append("### 🎯 Content-Market Fit")
            L.append("")
            L.append("| Term | Searches | Results | Fit |")
            L.append("|------|--------:|--------:|-----|")
            for f in fits[:10]:
                L.append(f"| {f['term']} | {f['searches']} | "
                         f"{f['results']} | {f['fit']} |")
            L.append("")

        # ── Trigger Effectiveness ──
        triggers = b.get("triggers", {})
        if triggers:
            L.append("### 🔔 Trigger Effectiveness (Fogg Model)")
            L.append("")
            L.append("| Trigger | Exposed | Acted | Rate |")
            L.append("|---------|--------:|------:|-----:|")
            for name, t in triggers.items():
                L.append(f"| {name} | {t['exposed']} | "
                         f"{t['acted']} | {t['rate']:.1%} |")
            L.append("")

        # ── Opportunity Sizing ──
        opp = b.get("opportunity", {})
        if opp and opp.get("daily_users", 0) > 0:
            L.append("### 💰 Opportunity Sizing")
            L.append("")
            L.append(f"| Scenario | Estimated Monthly Gain |")
            L.append(f"|----------|----------------------:|")
            L.append(f"| Current baseline | ~{opp['current_daily_actions']:.0f} actions/day |")
            if opp.get("discovery_gain_monthly", 0) > 0:
                L.append(f"| Discovery 3%→10% | "
                         f"+{opp['discovery_gain_monthly']} actions/month |")
            if opp.get("both_gain_monthly", 0) > 0:
                L.append(f"| Discovery + action improve | "
                         f"+{opp['both_gain_monthly']} actions/month |")
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
    country = None
    if "--days" in args:
        idx = sys.argv.index("--days")
        if idx + 1 < len(sys.argv):
            days = int(sys.argv[idx + 1])
    if "--country" in args:
        idx = sys.argv.index("--country")
        if idx + 1 < len(sys.argv):
            country = sys.argv[idx + 1]

    is_md = "--md" in args
    show_all = "--all" in args or is_md
    skip_args = {"--days", str(days), "--country"}
    if country:
        skip_args.add(country)
    no_flags = not (args - skip_args)

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
    country_label = f" | Country: {country}" if country else ""
    if not is_md:
        print(f"\n  📊 Esdeveniments.cat — GA4 Dashboard")
        print(f"  Property: {PROPERTY_ID} | Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        print(f"  Period: last {days} days{country_label}")

    d = collect_data(days, sections, country=country)

    if is_md:
        print(render_markdown(d, days))
    else:
        render_text(d, days, sections)
        print(f"\n{'='*60}")
        print(f"  Done.{' Run with --all for complete dashboard.' if not show_all else ''}")
        print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
