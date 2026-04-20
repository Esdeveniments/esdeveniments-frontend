#!/usr/bin/env python3
"""
Market Gap Finder: Discover untapped product opportunities via Google Trends.

Scans rising/breakout queries across countries and categories to find
search demand that's growing fast but likely has no dominant product yet.

Signals of opportunity:
  - Breakout queries (>5000% growth) = new demand, few competitors
  - Product-intent keywords ("how to", "app for", "tool for", "alternative to")
  - Cross-country convergence = same query rising in multiple markets
  - Rising queries in tech/business/health categories

Usage:
  # Setup:
  python3 -m venv /tmp/keyword-venv
  source /tmp/keyword-venv/bin/activate
  pip install pytrends 'urllib3<2'

  # Scan default categories + countries:
  python scripts/market-gap-finder.py

  # Focus on tech + health in US + UK:
  python scripts/market-gap-finder.py --categories technology health --countries US GB

  # Custom seed ideas to explore:
  python scripts/market-gap-finder.py --seeds "ai scheduling,meal prep app,budget tracker"

  # Longer timeframe for deeper trends:
  python scripts/market-gap-finder.py --timeframe "today 12-m"

  # JSON output:
  python scripts/market-gap-finder.py --json

No API keys required.
"""

import argparse
import json
import os
import re
import sys
import time
from collections import defaultdict
from datetime import datetime, timezone

try:
    from pytrends.request import TrendReq
except ImportError:
    print("❌ Missing dependencies. Install them:")
    print("   python3 -m venv /tmp/keyword-venv")
    print("   source /tmp/keyword-venv/bin/activate")
    print("   pip install pytrends 'urllib3<2'")
    sys.exit(1)

# ─── CONFIGURATION ───
DELAY = 10  # seconds between API calls to avoid 429s
OUTPUT_DIR = os.environ.get("MARKET_GAP_OUTPUT_DIR", "data/seo-audits")

# Google Trends category IDs (subset of most product-relevant ones)
# Full list: https://github.com/pat310/google-trends-api/wiki/Google-Trends-Categories
CATEGORIES = {
    "technology": 5,
    "business": 12,
    "health": 45,
    "finance": 7,
    "food_drink": 71,
    "travel": 67,
    "education": 958,
    "sports_fitness": 20,
    "home_garden": 11,
    "arts_entertainment": 3,
}

# Countries to scan (ISO 3166-1 alpha-2)
DEFAULT_COUNTRIES = ["US", "GB", "ES", "DE", "FR", "BR", "IN", "AU", "CA", "MX"]

# Product-intent signals in queries
PRODUCT_INTENT_PATTERNS = [
    r"\bhow to\b",
    r"\bapp for\b",
    r"\btool for\b",
    r"\btool to\b",
    r"\bsoftware for\b",
    r"\bsoftware to\b",
    r"\balternative to\b",
    r"\balternatives?\b",
    r"\bbest\b.*\bapp\b",
    r"\bbest\b.*\btool\b",
    r"\bbest\b.*\bsoftware\b",
    r"\bbest\b.*\bplatform\b",
    r"\bbest\b.*\bwebsite\b",
    r"\bbest way to\b",
    r"\bwhere to\b",
    r"\bwhere can i\b",
    r"\bis there a\b",
    r"\bcan i\b",
    r"\bautomate\b",
    r"\btemplate\b",
    r"\bgenerator\b",
    r"\btracker\b",
    r"\bmanager\b",
    r"\bplanner\b",
    r"\bfinder\b",
    r"\bbuilder\b",
    r"\bmaker\b",
    r"\bplatform\b",
    r"\bai\b.*\b(?:tool|app|for)\b",
    r"\bno.?code\b",
    r"\bsaas\b",
    r"\bfreelance\b.*\b(?:tool|platform|app)\b",
    r"\bremote\b.*\b(?:tool|app|work)\b",
    r"\bonline\b.*\b(?:tool|app|course)\b",
]

PRODUCT_INTENT_RE = re.compile("|".join(PRODUCT_INTENT_PATTERNS), re.IGNORECASE)

# Problem-signal patterns (people searching for solutions)
PROBLEM_PATTERNS = [
    r"\bhow do i\b",
    r"\bhow can i\b",
    r"\bwhy does\b",
    r"\bwhy is\b",
    r"\bfix\b",
    r"\bsolve\b",
    r"\bstruggl",
    r"\bfrustrat",
    r"\bproblem with\b",
    r"\bissue with\b",
    r"\bcan't\b",
    r"\bwon't\b",
    r"\bdoesn't work\b",
    r"\bneed help\b",
    r"\btrouble\b",
]

PROBLEM_RE = re.compile("|".join(PROBLEM_PATTERNS), re.IGNORECASE)

# Noise filters — skip queries matching these
NOISE_PATTERNS = [
    r"\bporn\b", r"\bxxx\b", r"\bnude\b", r"\bnaked\b",
    r"\blogin\b", r"\bsign in\b", r"\bpassword\b",
    r"\bweather\b", r"\bscore\b", r"\bresults?\b",
    r"\blyrics\b", r"\bmovie\b", r"\btrailer\b",
    r"\bdownload free\b", r"\btorrent\b", r"\bcrack\b",
    r"\bcoupon\b", r"\bdiscount code\b",
]
NOISE_RE = re.compile("|".join(NOISE_PATTERNS), re.IGNORECASE)


def create_pytrends():
    return TrendReq(
        hl="en-US",
        tz=0,
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


def classify_query(query):
    """Classify a query's opportunity signal strength."""
    q = query.lower()
    if NOISE_RE.search(q):
        return None  # skip noise

    signals = []
    score = 0

    if PRODUCT_INTENT_RE.search(q):
        signals.append("product_intent")
        score += 3

    if PROBLEM_RE.search(q):
        signals.append("problem_signal")
        score += 2

    # AI-related queries = hot market
    if re.search(r"\bai\b|\bartificial intel|\bchatgpt|\bgpt|\bllm\b|\bmachine learn", q):
        signals.append("ai_related")
        score += 2

    # Automation/productivity signals
    if re.search(r"\bautomat|\bworkflow|\bproductiv|\befficienc|\bstreamlin", q):
        signals.append("automation")
        score += 2

    # SaaS/platform signals
    if re.search(r"\bsaas\b|\bsubscription\b|\bmonthly\b|\bpricing\b|\bfree trial\b", q):
        signals.append("saas_signal")
        score += 1

    if not signals:
        signals.append("general_rising")
        score += 1

    return {"signals": signals, "score": score}


def fetch_trending_searches(pt, country):
    """Fetch today's real-time trending searches for a country."""
    try:
        df = pt.trending_searches(pn=country.lower())
        if df is not None and not df.empty:
            return df[0].tolist()[:20]
    except Exception as e:
        print(f"  ⚠️  Trending searches failed for {country}: {e}")
    return []


def fetch_rising_queries_for_category(pt, cat_id, geo, timeframe):
    """Fetch rising queries for a Google Trends category."""
    try:
        # Use an empty keyword with category filter to get category-wide rising queries
        pt.build_payload([""], cat=cat_id, timeframe=timeframe, geo=geo)
        related = pt.related_queries()
        results = {"rising": [], "top": []}

        for kw_data in related.values():
            if kw_data.get("rising") is not None and not kw_data["rising"].empty:
                for _, row in kw_data["rising"].iterrows():
                    results["rising"].append({
                        "query": row.get("query", ""),
                        "growth": str(row.get("value", 0)),
                    })
            if kw_data.get("top") is not None and not kw_data["top"].empty:
                for _, row in kw_data["top"].iterrows():
                    results["top"].append({
                        "query": row.get("query", ""),
                        "value": int(row.get("value", 0)),
                    })
        return results
    except Exception as e:
        print(f"  ⚠️  Category rising queries failed (cat={cat_id}, geo={geo}): {e}")
        return {"rising": [], "top": []}


def fetch_related_for_seed(pt, keyword, geo, timeframe):
    """Fetch related rising queries for a specific seed keyword."""
    try:
        pt.build_payload([keyword], cat=0, timeframe=timeframe, geo=geo)
        related = pt.related_queries()
        results = []
        for kw_data in related.values():
            if kw_data.get("rising") is not None and not kw_data["rising"].empty:
                for _, row in kw_data["rising"].iterrows():
                    results.append({
                        "query": row.get("query", ""),
                        "growth": str(row.get("value", 0)),
                    })
        return results
    except Exception as e:
        print(f"  ⚠️  Related queries failed for '{keyword}' ({geo}): {e}")
        return []


def fetch_interest_over_time(pt, keywords, geo, timeframe):
    """Fetch interest over time for growth calculation."""
    try:
        pt.build_payload(keywords[:5], cat=0, timeframe=timeframe, geo=geo)
        df = pt.interest_over_time()
        if df.empty:
            return {}
        if "isPartial" in df.columns:
            df = df.drop(columns=["isPartial"])
        results = {}
        total_rows = len(df)
        if total_rows < 4:
            return {}
        midpoint = total_rows // 2
        for col in df.columns:
            first_half = df[col].iloc[:midpoint].mean()
            second_half = df[col].iloc[midpoint:].mean()
            growth_pct = 0
            if first_half > 0:
                growth_pct = ((second_half - first_half) / first_half) * 100
            results[col] = {
                "avg_early": round(first_half, 1),
                "avg_recent": round(second_half, 1),
                "growth_pct": round(growth_pct, 1),
                "latest": int(df[col].iloc[-1]),
                "peak": int(df[col].max()),
            }
        return results
    except Exception as e:
        print(f"  ⚠️  Interest over time failed for {keywords}: {e}")
        return {}


def collect_data(categories, countries, seeds, timeframe):
    """Main data collection pipeline."""
    pt = create_pytrends()
    data = {
        "metadata": {
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
            "timeframe": timeframe,
            "countries": countries,
            "categories": list(categories.keys()),
        },
        "opportunities": [],  # all discovered opportunities
        "cross_country": {},  # queries rising in multiple countries
        "category_trends": {},  # per-category rising queries
        "trending_now": {},  # real-time trending by country
    }

    all_queries_by_country = defaultdict(set)

    # ─── 1. CATEGORY-BASED DISCOVERY ───
    for cat_name, cat_id in categories.items():
        print(f"\n📂 Scanning category: {cat_name}")
        data["category_trends"][cat_name] = {}

        for country in countries[:3]:  # limit countries per category to avoid rate limits
            print(f"   🌍 {country}...")
            results = fetch_rising_queries_for_category(pt, cat_id, country, timeframe)
            time.sleep(DELAY)

            rising = results.get("rising", [])
            if rising:
                data["category_trends"][cat_name][country] = rising
                for r in rising:
                    q = r["query"]
                    all_queries_by_country[q].add(country)

                    classification = classify_query(q)
                    if classification is None:
                        continue

                    is_breakout = r["growth"] == "Breakout"
                    try:
                        growth_val = int(r["growth"]) if not is_breakout else 9999
                    except (ValueError, TypeError):
                        growth_val = 0

                    data["opportunities"].append({
                        "query": q,
                        "growth": r["growth"],
                        "growth_val": growth_val,
                        "country": country,
                        "category": cat_name,
                        "source": "category_rising",
                        "is_breakout": is_breakout,
                        **classification,
                    })

    # ─── 2. SEED-BASED EXPLORATION ───
    if seeds:
        print(f"\n🌱 Exploring seed keywords...")
        for seed in seeds:
            print(f"   🔍 '{seed}'...")
            for country in countries[:3]:
                rising = fetch_related_for_seed(pt, seed, country, timeframe)
                time.sleep(DELAY)

                for r in rising:
                    q = r["query"]
                    all_queries_by_country[q].add(country)

                    classification = classify_query(q)
                    if classification is None:
                        continue

                    is_breakout = r["growth"] == "Breakout"
                    try:
                        growth_val = int(r["growth"]) if not is_breakout else 9999
                    except (ValueError, TypeError):
                        growth_val = 0

                    data["opportunities"].append({
                        "query": q,
                        "growth": r["growth"],
                        "growth_val": growth_val,
                        "country": country,
                        "category": f"seed:{seed}",
                        "source": "seed_related",
                        "is_breakout": is_breakout,
                        **classification,
                    })

    # ─── 3. REAL-TIME TRENDING (quick scan) ───
    print(f"\n📈 Checking real-time trending searches...")
    for country in countries[:5]:
        print(f"   🌍 {country}...")
        trending = fetch_trending_searches(pt, country)
        if trending:
            data["trending_now"][country] = trending
            for q in trending:
                all_queries_by_country[q].add(country)
        time.sleep(DELAY)

    # ─── 4. CROSS-COUNTRY CONVERGENCE ───
    for query, found_in in all_queries_by_country.items():
        if len(found_in) >= 2:
            data["cross_country"][query] = sorted(found_in)

    # ─── 5. VALIDATE TOP OPPORTUNITIES WITH INTEREST DATA ───
    # Sort and take top candidates for deeper validation
    scored = [o for o in data["opportunities"] if o["score"] >= 2]
    scored.sort(key=lambda x: (x["score"], x["growth_val"]), reverse=True)
    top_candidates = list({o["query"]: o for o in scored}.values())[:15]

    if top_candidates:
        print(f"\n🔬 Validating top {len(top_candidates)} candidates...")
        # Process in batches of 5
        for i in range(0, len(top_candidates), 5):
            batch = [c["query"] for c in top_candidates[i:i + 5]]
            print(f"   📊 Checking interest for: {', '.join(batch[:3])}...")
            interest = fetch_interest_over_time(pt, batch, "", timeframe)
            time.sleep(DELAY)

            for candidate in top_candidates[i:i + 5]:
                q = candidate["query"]
                if q in interest:
                    candidate["interest_data"] = interest[q]

    # Deduplicate opportunities by query (keep highest score)
    seen = {}
    for o in data["opportunities"]:
        q = o["query"].lower()
        if q not in seen or o["score"] > seen[q]["score"]:
            seen[q] = o
    data["opportunities"] = sorted(seen.values(), key=lambda x: (x["score"], x["growth_val"]), reverse=True)

    return data


def generate_markdown(data):
    """Generate a Markdown report of discovered opportunities."""
    lines = []
    meta = data["metadata"]
    lines.append("# 🔍 Market Gap Finder Report")
    lines.append(f"**Date**: {meta['date']}  ")
    lines.append(f"**Timeframe**: {meta['timeframe']}  ")
    lines.append(f"**Countries scanned**: {', '.join(meta['countries'])}  ")
    lines.append(f"**Categories**: {', '.join(meta['categories'])}")
    lines.append("")

    # ─── TOP OPPORTUNITIES ───
    opps = data["opportunities"]
    high_score = [o for o in opps if o["score"] >= 3]
    medium_score = [o for o in opps if o["score"] == 2]

    lines.append("## 🚀 High-Signal Opportunities (Score ≥ 3)")
    lines.append("")
    if high_score:
        lines.append("These queries have **multiple opportunity signals**: product intent + growth + market indicators.")
        lines.append("")
        lines.append("| # | Query | Growth | Country | Category | Signals | Score |")
        lines.append("|---|-------|--------|---------|----------|---------|-------|")
        for i, o in enumerate(high_score[:30], 1):
            growth_str = "🚀 Breakout" if o["is_breakout"] else f"+{o['growth']}%"
            signals = ", ".join(s.replace("_", " ") for s in o["signals"])
            cross = ""
            if o["query"] in data.get("cross_country", {}):
                countries = data["cross_country"][o["query"]]
                cross = f" 🌍 ({','.join(countries)})"
            lines.append(
                f"| {i} | **{o['query']}** | {growth_str} | {o['country']}{cross} | {o['category']} | {signals} | {o['score']} |"
            )
        lines.append("")

        # Detail cards for top 10
        lines.append("### Detailed Analysis")
        lines.append("")
        for o in high_score[:10]:
            lines.append(f"#### 💡 \"{o['query']}\"")
            growth_str = "🚀 Breakout (>5000%)" if o["is_breakout"] else f"+{o['growth']}% growth"
            lines.append(f"- **Growth**: {growth_str}")
            lines.append(f"- **Country**: {o['country']} | **Category**: {o['category']}")
            lines.append(f"- **Signals**: {', '.join(o['signals'])}")
            if "interest_data" in o:
                d = o["interest_data"]
                lines.append(f"- **Interest**: {d['avg_early']} → {d['avg_recent']} (latest: {d['latest']}, peak: {d['peak']})")
            cross = data.get("cross_country", {}).get(o["query"])
            if cross:
                lines.append(f"- **Also trending in**: {', '.join(cross)}")
            lines.append(f"- **Next step**: Search Google for \"{o['query']}\" — if top results are Reddit/forums/generic articles, there's a product gap.")
            lines.append("")
    else:
        lines.append("No high-signal opportunities found in this scan. Try broader categories or different seeds.")
        lines.append("")

    # ─── MEDIUM OPPORTUNITIES ───
    lines.append("## 📊 Medium-Signal Opportunities (Score = 2)")
    lines.append("")
    if medium_score:
        lines.append("| # | Query | Growth | Country | Category | Signals |")
        lines.append("|---|-------|--------|---------|----------|---------|")
        for i, o in enumerate(medium_score[:30], 1):
            growth_str = "🚀 Breakout" if o["is_breakout"] else f"+{o['growth']}%"
            signals = ", ".join(s.replace("_", " ") for s in o["signals"])
            lines.append(f"| {i} | {o['query']} | {growth_str} | {o['country']} | {o['category']} | {signals} |")
        lines.append("")
    else:
        lines.append("None found.")
        lines.append("")

    # ─── BREAKOUTS (regardless of score) ───
    breakouts = [o for o in opps if o["is_breakout"]]
    if breakouts:
        lines.append("## 💥 All Breakout Queries (>5000% Growth)")
        lines.append("")
        lines.append("Explosive growth = new demand entering the market.")
        lines.append("")
        lines.append("| Query | Country | Category | Signals |")
        lines.append("|-------|---------|----------|---------|")
        seen_breakouts = set()
        for o in breakouts:
            if o["query"].lower() in seen_breakouts:
                continue
            seen_breakouts.add(o["query"].lower())
            signals = ", ".join(s.replace("_", " ") for s in o["signals"])
            lines.append(f"| **{o['query']}** | {o['country']} | {o['category']} | {signals} |")
        lines.append("")

    # ─── CROSS-COUNTRY ───
    cross = data.get("cross_country", {})
    if cross:
        lines.append("## 🌍 Cross-Country Convergence")
        lines.append("")
        lines.append("Queries rising in **multiple countries** = potential global opportunity.")
        lines.append("")
        lines.append("| Query | Countries |")
        lines.append("|-------|-----------|")
        sorted_cross = sorted(cross.items(), key=lambda x: len(x[1]), reverse=True)
        for query, countries in sorted_cross[:25]:
            lines.append(f"| {query} | {', '.join(countries)} ({len(countries)} markets) |")
        lines.append("")

    # ─── CATEGORY HIGHLIGHTS ───
    lines.append("## 📂 Category Highlights")
    lines.append("")
    for cat_name, country_data in data.get("category_trends", {}).items():
        if not country_data:
            continue
        lines.append(f"### {cat_name.replace('_', ' ').title()}")
        lines.append("")
        for country, queries in country_data.items():
            if not queries:
                continue
            breakout_qs = [q for q in queries if q["growth"] == "Breakout"]
            rising_qs = [q for q in queries if q["growth"] != "Breakout"][:5]
            if breakout_qs:
                lines.append(f"**{country}** breakouts: {', '.join(q['query'] for q in breakout_qs[:5])}")
            if rising_qs:
                top_rising = ", ".join(f"{q['query']} (+{q['growth']}%)" for q in rising_qs)
                lines.append(f"**{country}** rising: {top_rising}")
            lines.append("")

    # ─── TRENDING NOW ───
    trending = data.get("trending_now", {})
    if trending:
        lines.append("## ⚡ Trending Right Now")
        lines.append("")
        lines.append("Today's trending searches (may indicate sudden demand spikes).")
        lines.append("")
        for country, queries in trending.items():
            lines.append(f"**{country}**: {', '.join(queries[:10])}")
            lines.append("")

    # ─── HOW TO VALIDATE ───
    lines.append("## ✅ How to Validate These Opportunities")
    lines.append("")
    lines.append("1. **Google the query** — Are top results Reddit threads, Quora, forums? → Gap exists")
    lines.append("2. **Check Product Hunt** — Has someone launched a product for this? When?")
    lines.append("3. **Search \"[query] app\" or \"[query] tool\"** — No dominant player? → Opportunity")
    lines.append("4. **Check App Store / Chrome Web Store** — Low ratings or few results? → Room to compete")
    lines.append("5. **Reddit/Twitter search** — Are people complaining about existing solutions?")
    lines.append("6. **Re-run with seeds**: `python scripts/market-gap-finder.py --seeds \"your idea keyword\"`")
    lines.append("")
    lines.append("---")
    lines.append(f"*Generated by `scripts/market-gap-finder.py` on {meta['date']}*")

    return "\n".join(lines)


def parse_seeds(seeds_str):
    return [s.strip() for s in seeds_str.split(",") if s.strip()]


def main():
    parser = argparse.ArgumentParser(
        description="Discover untapped product opportunities via Google Trends."
    )
    parser.add_argument(
        "--categories", nargs="*", default=None,
        help=f"Categories to scan (default: all). Options: {', '.join(CATEGORIES.keys())}",
    )
    parser.add_argument(
        "--countries", nargs="*", default=None,
        help=f"Country codes (default: {', '.join(DEFAULT_COUNTRIES[:5])}...)",
    )
    parser.add_argument(
        "--seeds", type=str, default=None,
        help='Comma-separated seed keywords to explore (e.g., "ai scheduling,budget tracker")',
    )
    parser.add_argument(
        "--timeframe", type=str, default="today 3-m",
        help="Timeframe (default: today 3-m). Options: 'today 3-m', 'today 12-m', etc.",
    )
    parser.add_argument("--json", action="store_true", help="Output JSON instead of Markdown")
    parser.add_argument("--output", type=str, default=None, help="Output file path")
    parser.add_argument(
        "--quick", action="store_true",
        help="Quick mode: scan fewer countries/categories (faster, less rate limiting)",
    )
    args = parser.parse_args()

    # Resolve categories
    if args.categories:
        categories = {c: CATEGORIES[c] for c in args.categories if c in CATEGORIES}
        if not categories:
            print(f"❌ No valid categories. Options: {', '.join(CATEGORIES.keys())}")
            sys.exit(1)
    else:
        categories = CATEGORIES if not args.quick else {
            k: v for k, v in list(CATEGORIES.items())[:3]
        }

    countries = args.countries or (DEFAULT_COUNTRIES[:4] if args.quick else DEFAULT_COUNTRIES[:6])
    seeds = parse_seeds(args.seeds) if args.seeds else []

    total_queries = len(categories) * len(countries[:3]) + len(seeds) * len(countries[:3]) + len(countries[:5])
    est_minutes = (total_queries * DELAY) // 60

    print("🔍 Market Gap Finder")
    print(f"   Categories: {', '.join(categories.keys())}")
    print(f"   Countries: {', '.join(countries)}")
    print(f"   Seeds: {', '.join(seeds) if seeds else 'none'}")
    print(f"   Timeframe: {args.timeframe}")
    print(f"   Estimated time: ~{est_minutes}-{est_minutes + 3} minutes ({total_queries} API calls)")
    print(f"   ⏱️  Using {DELAY}s delay between calls to avoid rate limits")

    data = collect_data(categories, countries, seeds, args.timeframe)

    # Stats
    total_opps = len(data["opportunities"])
    high = len([o for o in data["opportunities"] if o["score"] >= 3])
    breakouts = len([o for o in data["opportunities"] if o["is_breakout"]])
    cross = len(data.get("cross_country", {}))

    print(f"\n📊 Results: {total_opps} opportunities found")
    print(f"   🚀 High-signal: {high}")
    print(f"   💥 Breakouts: {breakouts}")
    print(f"   🌍 Cross-country: {cross}")

    # Output
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if args.json:
        output = json.dumps(data, indent=2, ensure_ascii=False, default=list)
        print(output)
        out_path = args.output or os.path.join(OUTPUT_DIR, f"market-gaps-{today}.json")
    else:
        output = generate_markdown(data)
        print("\n" + output)
        out_path = args.output or os.path.join(OUTPUT_DIR, f"market-gaps-{today}.md")

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(output)
    print(f"\n💾 Saved to: {out_path}")


if __name__ == "__main__":
    main()
