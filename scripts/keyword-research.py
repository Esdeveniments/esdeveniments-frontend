#!/usr/bin/env python3
"""
Google Trends keyword research for discovering trending and growing search terms.

Discovers keywords OUTSIDE your existing GSC data by querying Google Trends
for related/rising queries around seed keywords relevant to the project.

Usage:
  # Using venv (recommended):
  python3 -m venv /tmp/keyword-venv
  source /tmp/keyword-venv/bin/activate
  pip install pytrends

  # Run with defaults (Catalan events domain):
  python scripts/keyword-research.py

  # Custom seed keywords:
  python scripts/keyword-research.py --seeds "festivals barcelona,mercats nadal,fires catalunya"

  # Different region (default: ES-CT = Catalonia):
  python scripts/keyword-research.py --geo ES

  # Output JSON for programmatic use:
  python scripts/keyword-research.py --json

  # Specify timeframe (default: today 3-m = last 3 months):
  python scripts/keyword-research.py --timeframe "today 12-m"

Environment:
  No API keys required. Uses the unofficial Google Trends API via pytrends.
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone

try:
    from pytrends.request import TrendReq
    import pandas as pd
except ImportError:
    print("❌ Missing dependencies. Install them:")
    print("   python3 -m venv /tmp/keyword-venv")
    print("   source /tmp/keyword-venv/bin/activate")
    print("   pip install pytrends")
    sys.exit(1)

# ─── DEFAULT SEED KEYWORDS ───
# Grouped by topic for the Catalan events domain.
# Google Trends allows max 5 keywords per request.
DEFAULT_SEED_GROUPS = {
    "core": [
        "esdeveniments catalunya",
        "agenda catalunya",
        "que fer avui",
        "activitats cap de setmana",
        "que fer a barcelona",
    ],
    "festivals": [
        "festivals catalunya 2026",
        "fires i mercats",
        "festes majors catalunya",
        "mercats medievals catalunya",
        "concerts catalunya",
    ],
    "seasonal": [
        "sant jordi 2026",
        "revetlla sant joan",
        "fira de nadal",
        "carnaval catalunya",
        "setmana santa activitats",
    ],
    "family": [
        "activitats nens catalunya",
        "que fer amb nens",
        "excursions familiars",
        "parcs infantils",
        "activitats gratuites",
    ],
    "food_culture": [
        "rutes gastronòmiques",
        "fires gastronomiques",
        "exposicions barcelona",
        "teatre catalunya",
        "museus gratuïts",
    ],
}

# ─── CONFIGURATION ───
DEFAULT_GEO = "ES-CT"  # Catalonia
DEFAULT_TIMEFRAME = "today 3-m"  # Last 3 months
DEFAULT_LANGUAGE = "ca"  # Catalan
DELAY_BETWEEN_REQUESTS = 8  # seconds, to avoid rate limiting
DELAY_BETWEEN_KEYWORDS = 2  # seconds, lighter delay for individual keyword queries
OUTPUT_DIR = os.environ.get("KEYWORD_RESEARCH_OUTPUT_DIR", "data/seo-audits")


def create_pytrends():
    """Create a TrendReq instance with browser-like headers to avoid 429s."""
    return TrendReq(
        hl=DEFAULT_LANGUAGE,
        tz=-60,
        retries=5,
        backoff_factor=2,
        requests_args={
            "headers": {
                "User-Agent": (
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                ),
            }
        },
    )


def fetch_interest_over_time(pt, keywords, geo, timeframe):
    """Fetch interest over time for a batch of keywords (max 5)."""
    try:
        pt.build_payload(keywords, cat=0, timeframe=timeframe, geo=geo)
        df = pt.interest_over_time()
        if df.empty:
            return None
        # Drop the 'isPartial' column if present
        if "isPartial" in df.columns:
            df = df.drop(columns=["isPartial"])
        return df
    except Exception as e:
        print(f"  ⚠️  Interest over time failed for {keywords}: {e}")
        return None


def fetch_related_queries(pt, keywords, geo, timeframe):
    """Fetch related queries (top + rising) for each keyword."""
    try:
        pt.build_payload(keywords, cat=0, timeframe=timeframe, geo=geo)
        return pt.related_queries()
    except Exception as e:
        print(f"  ⚠️  Related queries failed for {keywords}: {e}")
        return {}


def fetch_related_topics(pt, keywords, geo, timeframe):
    """Fetch related topics (top + rising) for each keyword."""
    try:
        pt.build_payload(keywords, cat=0, timeframe=timeframe, geo=geo)
        result = pt.related_topics()
        # Validate structure — pytrends can return malformed data
        if not isinstance(result, dict):
            return {}
        return result
    except (IndexError, KeyError):
        # Known pytrends bug with topic widget parsing — skip silently
        return {}
    except Exception as e:
        print(f"  ⚠️  Related topics failed for {keywords}: {e}")
        return {}


def fetch_suggestions(pt, keyword):
    """Fetch Google Trends autocomplete suggestions for a keyword."""
    try:
        return pt.suggestions(keyword)
    except Exception as e:
        print(f"  ⚠️  Suggestions failed for '{keyword}': {e}")
        return []


def calculate_growth(df):
    """Calculate growth metrics for each keyword from interest_over_time data."""
    if df is None or df.empty:
        return {}

    results = {}
    total_rows = len(df)
    if total_rows < 4:
        return {}

    midpoint = total_rows // 2
    for col in df.columns:
        first_half = df[col].iloc[:midpoint].mean()
        second_half = df[col].iloc[midpoint:].mean()
        latest = df[col].iloc[-1]
        peak = df[col].max()

        growth_pct = 0
        if first_half > 0:
            growth_pct = ((second_half - first_half) / first_half) * 100

        results[col] = {
            "avg_first_half": round(first_half, 1),
            "avg_second_half": round(second_half, 1),
            "latest_value": int(latest),
            "peak_value": int(peak),
            "growth_pct": round(growth_pct, 1),
            "trend": "📈 growing" if growth_pct > 15 else "📉 declining" if growth_pct < -15 else "➡️ stable",
        }
    return results


def collect_all_data(seed_groups, geo, timeframe):
    """Run all Google Trends queries and collect results."""
    pt = create_pytrends()
    data = {
        "metadata": {
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
            "geo": geo,
            "timeframe": timeframe,
        },
        "interest_growth": {},
        "rising_queries": {},
        "top_queries": {},
        "rising_topics": {},
        "suggestions": {},
        "breakout_keywords": [],
    }

    for group_name, keywords in seed_groups.items():
        print(f"\n🔍 Analyzing group: {group_name}")
        print(f"   Keywords: {', '.join(keywords)}")

        # 1. Interest over time + growth (all 5 at once for comparison)
        print("   📊 Fetching interest over time...")
        df = fetch_interest_over_time(pt, keywords, geo, timeframe)
        growth = calculate_growth(df)
        if growth:
            data["interest_growth"][group_name] = growth
        time.sleep(DELAY_BETWEEN_REQUESTS)

        # 2-4. Process each keyword individually to reduce rate limit pressure
        for kw in keywords:
            print(f"   🔗 Fetching related queries for '{kw}'...")
            related = fetch_related_queries(pt, [kw], geo, timeframe)
            if kw in related:
                rel = related[kw]

                # Rising queries — these are the golden nuggets
                if rel.get("rising") is not None and not rel["rising"].empty:
                    rising_list = []
                    for _, row in rel["rising"].iterrows():
                        query = row.get("query", "")
                        value = row.get("value", 0)
                        rising_list.append({
                            "query": query,
                            "growth": str(value),
                        })
                        if str(value) == "Breakout" or (isinstance(value, (int, float)) and value > 1000):
                            data["breakout_keywords"].append({
                                "query": query,
                                "seed": kw,
                                "group": group_name,
                            })
                    if rising_list:
                        data["rising_queries"][kw] = rising_list

                # Top queries
                if rel.get("top") is not None and not rel["top"].empty:
                    top_list = []
                    for _, row in rel["top"].iterrows():
                        top_list.append({
                            "query": row.get("query", ""),
                            "value": int(row.get("value", 0)),
                        })
                    if top_list:
                        data["top_queries"][kw] = top_list

            time.sleep(DELAY_BETWEEN_REQUESTS)

            # Related topics
            print(f"   📚 Fetching related topics for '{kw}'...")
            topics = fetch_related_topics(pt, [kw], geo, timeframe)
            if kw in topics:
                t = topics[kw]
                if t.get("rising") is not None and not t["rising"].empty:
                    rising_topics = []
                    for _, row in t["rising"].iterrows():
                        title = row.get("topic_title", "")
                        topic_type = row.get("topic_type", "")
                        value = row.get("value", 0)
                        if title:
                            rising_topics.append({
                                "topic": title,
                                "type": topic_type,
                                "growth": str(value),
                            })
                    if rising_topics:
                        data["rising_topics"][kw] = rising_topics

            time.sleep(DELAY_BETWEEN_REQUESTS)

            # Suggestions
            print(f"   💡 Fetching suggestions for '{kw}'...")
            suggs = fetch_suggestions(pt, kw)
            if suggs:
                data["suggestions"][kw] = [
                    {"title": s.get("title", ""), "type": s.get("type", "")}
                    for s in suggs[:8]
                ]
            time.sleep(DELAY_BETWEEN_KEYWORDS)

    return data


def generate_markdown(data):
    """Generate a human-readable Markdown report from the collected data."""
    lines = []
    meta = data["metadata"]
    lines.append(f"# 🔍 Keyword Research Report")
    lines.append(f"**Date**: {meta['date']}  ")
    lines.append(f"**Region**: {meta['geo']}  ")
    lines.append(f"**Timeframe**: {meta['timeframe']}")
    lines.append("")

    # ── BREAKOUT KEYWORDS (most important) ──
    breakouts = data.get("breakout_keywords", [])
    lines.append("## 🚀 Breakout Keywords (Fastest Growing)")
    lines.append("")
    if breakouts:
        lines.append("These keywords have **explosive growth** — Google marks them as 'Breakout' (>5000% growth).")
        lines.append("")
        lines.append("| Keyword | Seed Query | Group |")
        lines.append("|---------|------------|-------|")
        seen = set()
        for b in breakouts:
            q = b["query"]
            if q not in seen:
                lines.append(f"| **{q}** | {b['seed']} | {b['group']} |")
                seen.add(q)
    else:
        lines.append("No breakout keywords detected in this period.")
    lines.append("")

    # ── INTEREST GROWTH ──
    lines.append("## 📊 Interest Growth by Seed Keyword")
    lines.append("")
    for group_name, keywords in data.get("interest_growth", {}).items():
        lines.append(f"### {group_name.replace('_', ' ').title()}")
        lines.append("")
        lines.append("| Keyword | First Half Avg | Second Half Avg | Growth | Latest | Trend |")
        lines.append("|---------|---------------|-----------------|--------|--------|-------|")
        for kw, stats in sorted(keywords.items(), key=lambda x: x[1]["growth_pct"], reverse=True):
            lines.append(
                f"| {kw} | {stats['avg_first_half']} | {stats['avg_second_half']} "
                f"| {stats['growth_pct']:+.1f}% | {stats['latest_value']} | {stats['trend']} |"
            )
        lines.append("")

    # ── RISING QUERIES ──
    lines.append("## 🔥 Rising Related Queries")
    lines.append("")
    lines.append("Queries people *also* search — sorted by growth. Use these for content ideas.")
    lines.append("")
    for seed, queries in data.get("rising_queries", {}).items():
        lines.append(f"### → {seed}")
        lines.append("")
        lines.append("| Query | Growth |")
        lines.append("|-------|--------|")
        for q in queries[:15]:
            growth_str = q["growth"]
            if growth_str == "Breakout":
                growth_str = "🚀 Breakout"
            else:
                try:
                    growth_str = f"+{int(growth_str)}%"
                except ValueError:
                    pass
            lines.append(f"| {q['query']} | {growth_str} |")
        lines.append("")

    # ── RISING TOPICS ──
    rising_topics = data.get("rising_topics", {})
    if rising_topics:
        lines.append("## 📚 Rising Topics")
        lines.append("")
        for seed, topics in rising_topics.items():
            lines.append(f"### → {seed}")
            lines.append("")
            lines.append("| Topic | Type | Growth |")
            lines.append("|-------|------|--------|")
            for t in topics[:10]:
                growth_str = t["growth"]
                if growth_str == "Breakout":
                    growth_str = "🚀 Breakout"
                lines.append(f"| {t['topic']} | {t['type']} | {growth_str} |")
            lines.append("")

    # ── TOP QUERIES (stable high-volume) ──
    lines.append("## 📋 Top Related Queries (Stable High-Volume)")
    lines.append("")
    lines.append("Already popular queries — check if you're ranking for these.")
    lines.append("")
    for seed, queries in data.get("top_queries", {}).items():
        lines.append(f"### → {seed}")
        lines.append("")
        lines.append("| Query | Relevance Score |")
        lines.append("|-------|----------------|")
        for q in queries[:10]:
            lines.append(f"| {q['query']} | {q['value']} |")
        lines.append("")

    # ── SUGGESTIONS ──
    suggestions = data.get("suggestions", {})
    if suggestions:
        lines.append("## 💡 Google Autocomplete Suggestions")
        lines.append("")
        lines.append("What Google suggests when users start typing these keywords.")
        lines.append("")
        for seed, suggs in suggestions.items():
            if suggs:
                lines.append(f"**{seed}**: {', '.join(s['title'] for s in suggs)}")
                lines.append("")

    # ── ACTIONABLE SUMMARY ──
    lines.append("## ✅ Actionable Summary")
    lines.append("")
    lines.append("### Content Opportunities")
    lines.append("")

    # Collect all rising queries sorted by growth
    all_rising = []
    for seed, queries in data.get("rising_queries", {}).items():
        for q in queries:
            try:
                growth_val = int(q["growth"]) if q["growth"] != "Breakout" else 9999
            except ValueError:
                growth_val = 0
            all_rising.append((q["query"], growth_val, seed))

    all_rising.sort(key=lambda x: x[1], reverse=True)
    if all_rising:
        lines.append("**Top 20 keywords to target** (sorted by growth):")
        lines.append("")
        lines.append("| # | Keyword | Growth | Related To |")
        lines.append("|---|---------|--------|------------|")
        seen = set()
        rank = 0
        for query, growth, seed in all_rising:
            if query.lower() in seen:
                continue
            seen.add(query.lower())
            rank += 1
            if rank > 20:
                break
            growth_str = "🚀 Breakout" if growth == 9999 else f"+{growth}%"
            lines.append(f"| {rank} | **{query}** | {growth_str} | {seed} |")
        lines.append("")

    lines.append("---")
    lines.append(f"*Generated by `scripts/keyword-research.py` on {meta['date']}*")

    return "\n".join(lines)


def parse_custom_seeds(seeds_str):
    """Parse comma-separated seed keywords into a single group."""
    keywords = [k.strip() for k in seeds_str.split(",") if k.strip()]
    # Split into groups of 5 (Google Trends limit)
    groups = {}
    for i in range(0, len(keywords), 5):
        chunk = keywords[i:i + 5]
        groups[f"custom_{i // 5 + 1}"] = chunk
    return groups


def main():
    parser = argparse.ArgumentParser(
        description="Google Trends keyword research for discovering trending search terms."
    )
    parser.add_argument(
        "--seeds",
        type=str,
        default=None,
        help='Comma-separated seed keywords (e.g., "festivals barcelona,mercats nadal")',
    )
    parser.add_argument(
        "--groups",
        type=str,
        nargs="*",
        default=None,
        help=f"Which seed groups to run (default: all). Options: {', '.join(DEFAULT_SEED_GROUPS.keys())}",
    )
    parser.add_argument("--geo", type=str, default=DEFAULT_GEO, help=f"Geo code (default: {DEFAULT_GEO})")
    parser.add_argument(
        "--timeframe", type=str, default=DEFAULT_TIMEFRAME,
        help=f"Timeframe (default: {DEFAULT_TIMEFRAME}). Examples: 'today 3-m', 'today 12-m', '2026-01-01 2026-04-01'",
    )
    parser.add_argument("--json", action="store_true", help="Output raw JSON instead of Markdown")
    parser.add_argument("--output", type=str, default=None, help="Output file path (default: stdout + file in data/seo-audits/)")
    args = parser.parse_args()

    # Determine seed keywords
    if args.seeds:
        seed_groups = parse_custom_seeds(args.seeds)
    elif args.groups:
        seed_groups = {g: DEFAULT_SEED_GROUPS[g] for g in args.groups if g in DEFAULT_SEED_GROUPS}
        if not seed_groups:
            print(f"❌ No valid groups. Options: {', '.join(DEFAULT_SEED_GROUPS.keys())}")
            sys.exit(1)
    else:
        seed_groups = DEFAULT_SEED_GROUPS

    print("🔍 Google Trends Keyword Research")
    print(f"   Region: {args.geo}")
    print(f"   Timeframe: {args.timeframe}")
    print(f"   Seed groups: {', '.join(seed_groups.keys())}")
    print(f"   Total keywords: {sum(len(v) for v in seed_groups.values())}")

    # Collect data
    data = collect_all_data(seed_groups, args.geo, args.timeframe)

    # Output
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    if args.json:
        output = json.dumps(data, indent=2, ensure_ascii=False)
        print(output)
        out_path = args.output or os.path.join(OUTPUT_DIR, f"keywords-{today}.json")
    else:
        output = generate_markdown(data)
        print(output)
        out_path = args.output or os.path.join(OUTPUT_DIR, f"keywords-{today}.md")

    # Save to file
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(output)
    print(f"\n💾 Saved to: {out_path}")


if __name__ == "__main__":
    main()
