#!/usr/bin/env python3
"""AdSense Management API v2 check for esdeveniments.cat (Active View viewability, RPM, units, alerts).

Usage:
  python3 scripts/adsense-check.py               # last 30 days (default)
  python3 scripts/adsense-check.py --days 365    # last 12 months
  python3 scripts/adsense-check.py --json        # machine-readable JSON output

Requires local `gcloud auth application-default` OAuth credentials with the
`https://www.googleapis.com/auth/adsense.readonly` scope (Google AdSense API
does not allow service accounts).
"""
import argparse
import datetime as dt
import json
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request

ACCOUNT = "accounts/pub-2456713018173238"
QUOTA_PROJECT = "esdeveniments-3"
DEFAULT_DOMAIN = "esdeveniments.cat"
REPORT_METRICS = [
    "AD_REQUESTS",
    "AD_REQUESTS_COVERAGE",
    "IMPRESSIONS",
    "ACTIVE_VIEW_VIEWABILITY",
    "CLICKS",
    "IMPRESSIONS_RPM",
    "ESTIMATED_EARNINGS",
]
SCOPE_HINT = (
    'gcloud auth application-default login --scopes='
    '"openid,https://www.googleapis.com/auth/userinfo.email,'
    'https://www.googleapis.com/auth/cloud-platform,'
    'https://www.googleapis.com/auth/analytics.readonly,'
    'https://www.googleapis.com/auth/webmasters.readonly,'
    'https://www.googleapis.com/auth/adsense.readonly"'
)


def get_token() -> str:
    return subprocess.check_output(
        ["gcloud", "auth", "application-default", "print-access-token"],
        stderr=subprocess.DEVNULL,
        text=True,
    ).strip()


def api_get(token: str, path: str, params: dict | None = None) -> dict:
    url = f"https://adsense.googleapis.com/v2/{path.lstrip('/')}"
    if params:
        url += "?" + urllib.parse.urlencode(params, doseq=True)
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "x-goog-user-project": QUOTA_PROJECT,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        body = exc.read().decode()[:400]
        if exc.code == 403 and "SCOPE_INSUFFICIENT" in body:
            sys.stderr.write(
                "Missing adsense.readonly scope in gcloud ADC. Re-login with:\n"
                f"  {SCOPE_HINT}\n"
            )
            raise SystemExit(1)
        raise RuntimeError(f"AdSense API HTTP {exc.code}: {body}") from exc


def date_params(days: int) -> dict:
    end = dt.date.today()
    start = end - dt.timedelta(days=days)
    return {
        "dateRange": "CUSTOM",
        "startDate.year": start.year,
        "startDate.month": start.month,
        "startDate.day": start.day,
        "endDate.year": end.year,
        "endDate.month": end.month,
        "endDate.day": end.day,
    }


def rows_as_dicts(report: dict) -> list[dict]:
    headers = [h["name"] for h in report.get("headers", [])]
    return [
        {headers[i]: cell.get("value", "") for i, cell in enumerate(row.get("cells", []))}
        for row in report.get("rows", [])
    ]


def print_table(title: str, rows: list[dict], cols: list[tuple[str, str]]) -> None:
    print(f"\n=== {title} ===")
    if not rows:
        print("  (no data)")
        return
    widths = [
        max(len(label), *(len(str(r.get(key, ""))) for r in rows))
        for key, label in cols
    ]
    print("  " + " | ".join(label.ljust(w) for (_, label), w in zip(cols, widths)))
    print("  " + "-+-".join("-" * w for w in widths))
    for r in rows:
        print(
            "  "
            + " | ".join(str(r.get(key, "")).ljust(w) for (key, _), w in zip(cols, widths))
        )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--days", type=int, default=30, help="Lookback window in days (default: 30)")
    parser.add_argument("--domain", default=DEFAULT_DOMAIN, help=f"Site domain filter (default: {DEFAULT_DOMAIN})")
    parser.add_argument("--json", action="store_true", help="Output structured JSON")
    args = parser.parse_args()
    if args.days < 1:
        parser.error("--days must be >= 1")

    token = get_token()
    dates = date_params(args.days)

    sites = api_get(token, f"{ACCOUNT}/sites").get("sites", [])
    alerts = api_get(token, f"{ACCOUNT}/alerts").get("alerts", [])

    by_format = api_get(
        token,
        f"{ACCOUNT}/reports:generate",
        {
            **dates,
            "filters": [f"OWNED_SITE_DOMAIN_NAME=={args.domain}"],
            "dimensions": ["AD_FORMAT_NAME", "PLATFORM_TYPE_NAME"],
            "metrics": REPORT_METRICS,
            "orderBy": ["-ESTIMATED_EARNINGS"],
        },
    )

    by_unit = api_get(
        token,
        f"{ACCOUNT}/reports:generate",
        {
            **dates,
            "dimensions": ["AD_UNIT_NAME", "PLATFORM_TYPE_NAME"],
            "metrics": REPORT_METRICS,
            "orderBy": ["-ESTIMATED_EARNINGS"],
        },
    )

    payload = {
        "domain": args.domain,
        "days": args.days,
        "site": next((s for s in sites if s.get("domain") == args.domain), None),
        "alerts": alerts,
        "byFormat": rows_as_dicts(by_format),
        "byUnit": rows_as_dicts(by_unit),
    }

    if args.json:
        print(json.dumps(payload, indent=2))
        return

    site = payload["site"] or {}
    print(
        f"AdSense {args.domain} (last {args.days}d) | "
        f"state={site.get('state', '?')} | autoAds={site.get('autoAdsEnabled', '?')} | "
        f"alerts={len(alerts)}"
    )
    cols = [
        ("AD_FORMAT_NAME", "Format"),
        ("PLATFORM_TYPE_NAME", "Platform"),
        ("AD_REQUESTS", "Req"),
        ("IMPRESSIONS", "Imp"),
        ("ACTIVE_VIEW_VIEWABILITY", "Viewability"),
        ("CLICKS", "Clicks"),
        ("IMPRESSIONS_RPM", "RPM"),
        ("ESTIMATED_EARNINGS", "EUR"),
    ]
    print_table(f"{args.domain} by Format x Platform ({args.days}d)", payload["byFormat"], cols)
    unit_cols = [("AD_UNIT_NAME", "Ad Unit")] + cols[1:]
    print_table(f"Manual Ad Units x Platform ({args.days}d, account-wide)", payload["byUnit"], unit_cols)


if __name__ == "__main__":
    main()
