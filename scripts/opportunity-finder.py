#!/usr/bin/env python3
"""
Opportunity Finder: Discover product gaps using Google Autocomplete + Trends.

Strategy:
  1. Google Autocomplete (free, no API key, no rate limits) reveals what people
     actually type. Product-intent prefixes like "best app for...",
     "alternative to...", "how to... without..." surface unmet demand.
  2. "Alphabet soup" expansion: append a-z after each prefix to discover
     long-tail queries Google suggests.
  3. Score results for product/solution-seeking intent.
  4. Validate top candidates with pytrends for growth trends.

Usage:
  # Setup:
  python3 -m venv /tmp/keyword-venv
  source /tmp/keyword-venv/bin/activate
  pip install pytrends 'urllib3<2'

  # Run with default intent prefixes:
  python scripts/opportunity-finder.py

  # Focus on a specific niche:
  python scripts/opportunity-finder.py --niche "local events,travel planning,family activities"

  # Specific language/country:
  python scripts/opportunity-finder.py --lang es --country ES

  # More alphabet soup letters (slower, more results):
  python scripts/opportunity-finder.py --depth full

  # Skip trends validation (faster, autocomplete only):
  python scripts/opportunity-finder.py --skip-trends

  # JSON output:
  python scripts/opportunity-finder.py --json

No API keys required. Google Autocomplete has generous rate limits.
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.request
import urllib.parse
from collections import defaultdict
from datetime import datetime, timezone

try:
    from pytrends.request import TrendReq
    HAS_PYTRENDS = True
except ImportError:
    HAS_PYTRENDS = False

# ─── CONFIGURATION ───
OUTPUT_DIR = os.environ.get("OPPORTUNITY_OUTPUT_DIR", "data/seo-audits")
BRAVE_API_KEY = os.environ.get("BRAVE_SEARCH_API_KEY", "")

# Domain patterns that indicate a dedicated product (not forums/articles)
PRODUCT_DOMAIN_PATTERNS = [
    r"\.(app|io|co|ai|tools|dev|software|cloud|tech|online)$",
    r"play\.google\.com",
    r"apps\.apple\.com",
    r"chromewebstore\.google\.com",
    r"producthunt\.com",
    r"alternativeto\.net",
    r"capterra\.com",
    r"g2\.com",
    r"getapp\.com",
    r"sourceforge\.net",
    r"saasworthy\.com",
    r"softwareadvice\.com",
]
PRODUCT_DOMAIN_RE = re.compile("|".join(PRODUCT_DOMAIN_PATTERNS), re.IGNORECASE)

# Well-known SaaS/product domains that don't match TLD patterns
KNOWN_PRODUCT_DOMAINS = [
    "notion.so", "trello.com", "asana.com", "slack.com", "zoom.us",
    "figma.com", "canva.com", "grammarly.com", "todoist.com",
    "evernote.com", "dropbox.com", "1password.com", "duolingo.com",
    "teamviewer.com", "anydesk.com", "obsidian.md", "linear.app",
    "turbotax.intuit.com", "quickbooks.intuit.com", "freshbooks.com",
    "mailchimp.com", "hubspot.com", "salesforce.com", "airtable.com",
    "monday.com", "clickup.com", "basecamp.com", "miro.com",
]

# Domains that signal NO dedicated product exists (forums, Q&A, articles)
FORUM_DOMAINS = [
    "reddit.com", "quora.com", "stackexchange.com", "stackoverflow.com",
    "medium.com", "wordpress.com", "blogspot.com", "wikihow.com",
    "yahoo.com/answers", "answers.com",
]

# Generic content domains (listicles, reviews — product exists but market may be open)
LISTICLE_DOMAINS = [
    "pcmag.com", "techradar.com", "tomsguide.com", "cnet.com",
    "zapier.com", "makeuseof.com", "lifehacker.com", "wirecutter.com",
    "geekflare.com", "slant.co", "trustradius.com", "nerdwallet.com",
    "investopedia.com", "healthline.com", "verywellhealth.com",
]

# Software/digital product signals — used in --software-only mode
# NOTE: matched with word boundaries (\b) to prevent "app" matching "apply"
SOFTWARE_SIGNALS = [
    r"\bapp\b", r"\bsoftware\b", r"\bplatform\b", r"\bextension\b",
    r"\bplugin\b", r"\bbot\b", r"\bgenerator\b", r"\btracker\b",
    r"\bplanner\b", r"\bmanager\b", r"\borganizer\b", r"\bfinder\b",
    r"\bassistant\b", r"\bwidget\b", r"\bscript\b", r"\bbrowser\b",
    r"\bsaas\b", r"\bapi\b", r"\bonline tool\b", r"\bdigital\b",
    r"\bweb app\b", r"\bdesktop app\b", r"\bmobile app\b",
    r"\bandroid\b", r"\biphone\b", r"\bipad\b",
    r"\bchrome extension\b", r"\bai\b", r"\bautomation\b",
    r"\bdashboard\b", r"\bcrm\b", r"\berp\b",
]
SOFTWARE_SIGNALS_RE = re.compile("|".join(SOFTWARE_SIGNALS), re.IGNORECASE)

# Physical/non-digital context — disqualifies from software-only mode
PHYSICAL_CONTEXT_RE = re.compile(
    r"\b(hair|tile|tiles|wall|bottle|wine|beer|stain|wood|paint|garden|"
    r"skin|nail|lawn|roof|pipe|drain|carpet|floor|cement|concrete|brick|"
    r"fence|grill|bbq|barbecue|cooking|recipe|baking|sewing|knitting|"
    r"passport|pension|visa|residency|ehic|driving|driving test|"
    r"watch band|watch strap|lip|eyebrow|eyelash|makeup|tattoo)\b",
    re.IGNORECASE,
)

# Brand names — queries containing these + "how to" are support questions, not gaps
KNOWN_BRANDS = [
    "whatsapp", "google", "apple", "microsoft", "amazon", "netflix",
    "spotify", "uber", "airbnb", "facebook", "instagram", "tiktok",
    "youtube", "twitter", "snapchat", "telegram", "signal", "zoom",
    "slack", "discord", "skype", "outlook", "gmail", "icloud",
    "iphone", "ipad", "macbook", "samsung", "xiaomi", "huawei",
    "windows", "macos", "linux", "android", "ios", "chrome",
    "firefox", "safari", "edge", "paypal", "venmo", "cash app",
    "adobe", "photoshop", "premiere", "canva", "figma", "notion",
    "excel", "word", "powerpoint", "teams", "planner",
    "nhs", "sky", "bt", "vodafone",  # UK brands
]

# CPC estimates by category for revenue estimation (USD)
CPC_ESTIMATES = {
    "finance": 4.50,
    "health": 2.80,
    "productivity": 2.00,
    "creative": 1.50,
    "events": 1.20,
    "local": 1.00,
    "general": 1.50,
}

# Product-intent prefixes that reveal unmet demand
# These are queries where people are LOOKING FOR a product/solution
INTENT_PREFIXES = {
    "product_search": [
        "best app for ",
        "best tool for ",
        "best software for ",
        "best way to ",
        "best free ",
    ],
    "alternative_seeking": [
        "alternative to ",
        "cheaper alternative to ",
        "free alternative to ",
        "open source alternative to ",
    ],
    "problem_signal": [
        "how to ",
        "how do i ",
        "is there an app that ",
        "is there a way to ",
        "i need help with ",
    ],
    "frustration": [
        "why is it so hard to ",
        "why cant i ",
        "there is no good ",
        "i wish there was ",
    ],
    "comparison": [
        "vs ",
        "which is better ",
        "compare ",
    ],
}

# Niche-specific seed suffixes (appended to intent prefixes)
NICHE_SEEDS = {
    "events": [
        "find local events",
        "discover things to do",
        "weekend activities",
        "family events near me",
        "cultural events",
        "plan my weekend",
        "outdoor activities nearby",
    ],
    "productivity": [
        "organize my tasks",
        "manage projects",
        "automate workflows",
        "schedule meetings",
        "track habits",
        "take notes",
        "focus and concentrate",
    ],
    "health": [
        "track calories",
        "meditation",
        "workout at home",
        "sleep better",
        "mental health",
        "meal planning",
        "find a therapist",
    ],
    "finance": [
        "budget money",
        "save money",
        "invest small amounts",
        "track expenses",
        "split bills",
        "find deals",
        "compare prices",
    ],
    "creative": [
        "edit photos",
        "make music",
        "design logo",
        "create website",
        "write better",
        "learn drawing",
        "video editing",
    ],
    "local": [
        "find restaurants nearby",
        "book appointments",
        "find parking",
        "find coworking space",
        "neighborhood recommendations",
        "local delivery",
        "community events",
    ],
}

# Score modifiers for query classification
STRONG_PRODUCT_SIGNALS = [
    "app", "tool", "software", "platform", "service", "website",
    "plugin", "extension", "bot", "generator", "tracker", "planner",
    "manager", "organizer", "finder", "helper", "assistant",
]

STRONG_PROBLEM_SIGNALS = [
    "how to", "how do", "can i", "is there", "i need", "i want",
    "without", "for free", "easily", "quickly", "automatically",
]

# Noise patterns to filter out
NOISE_RE = re.compile(
    r"\b("
    r"porn|xxx|nude|naked|sex|hentai|onlyfans|"
    r"cheat|hack|crack|pirate|torrent|free download|"
    r"tiktok|instagram|facebook|twitter|reddit|"
    r"lyrics|movie|episode|season|trailer|"
    r"meme|funny|joke|"
    r"cheats for|walkthrough|"
    r"celebrity|kardashian|"
    r"game of thrones|"
    r"free v.?bucks"
    r")\b",
    re.IGNORECASE,
)


# ─── COMPETITION CHECKER (Brave Search API) ───

def brave_search(query, count=10):
    """Search Brave and return top results. Free tier: 1000 queries/month."""
    if not BRAVE_API_KEY:
        return None

    url = "https://api.search.brave.com/res/v1/web/search"
    headers = {"X-Subscription-Token": BRAVE_API_KEY, "Accept": "application/json"}
    params = {"q": query, "count": count}

    req = urllib.request.Request(
        f"{url}?{urllib.parse.urlencode(params)}",
        headers=headers,
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as e:
        print(f"  ⚠ Brave search error for '{query}': {e}", file=sys.stderr)
        return None


def extract_domain(url):
    """Extract clean domain from URL."""
    try:
        parsed = urllib.parse.urlparse(url)
        return parsed.netloc.lower().replace("www.", "")
    except Exception:
        return ""


def is_known_product_domain(domain):
    """Check if domain is a known SaaS/product."""
    return any(known in domain for known in KNOWN_PRODUCT_DOMAINS)


def analyze_competition(query):
    """
    Search for a query on Brave and analyze top results.

    Returns:
        dict with competition_level (LOW/MEDIUM/HIGH/SATURATED),
        competition_score (0-100), product_count, search_result_count,
        products_found, and verdict.
    """
    data = brave_search(query)
    if not data:
        return {"competition": "unknown", "competition_score": 50, "reason": "no search data"}

    results = data.get("web", {}).get("results", [])
    total_results = data.get("web", {}).get("totalResults", 0)
    if not results:
        return {"competition": "unknown", "competition_score": 50, "reason": "no results"}

    products = []  # dedicated product pages
    forums = []    # forum/Q&A results
    listicles = [] # review/listicle articles
    other = []     # everything else

    product_title_signals = [
        "pricing", "sign up", "free trial", "download", "get started",
        "plans", "subscribe", "start free", "try free", "try for free",
        "buy now", "get it", "install", "add to chrome", "open source",
        "features", "how it works", "our product",
    ]

    for r in results[:10]:
        url = r.get("url", "")
        title = r.get("title", "").lower()
        desc = r.get("description", "").lower()
        domain = extract_domain(url)

        if any(f in domain for f in FORUM_DOMAINS):
            forums.append({"domain": domain, "title": r.get("title", "")})
        elif any(l in domain for l in LISTICLE_DOMAINS):
            listicles.append({"domain": domain, "title": r.get("title", "")})
        elif (
            PRODUCT_DOMAIN_RE.search(domain)
            or is_known_product_domain(domain)
            or any(kw in title for kw in product_title_signals)
            or any(kw in desc for kw in ["pricing", "free trial", "sign up", "plans start"])
        ):
            products.append({"domain": domain, "title": r.get("title", ""), "url": url})
        else:
            other.append({"domain": domain, "title": r.get("title", "")})

    product_count = len(products)
    forum_count = len(forums)
    listicle_count = len(listicles)

    # Quantitative competition score (0-100, lower = less competition)
    comp_score = 0
    comp_score += product_count * 18   # each product = 18 points (max ~90 for 5)
    comp_score += listicle_count * 5    # listicles = moderate competition signal
    comp_score -= forum_count * 8       # forums = low competition signal
    comp_score = max(0, min(100, comp_score))

    # Determine competition level
    if product_count >= 4:
        level = "SATURATED"
        verdict = f"❌ {product_count} products in top 10 — crowded"
    elif product_count >= 2:
        level = "HIGH"
        verdict = f"⚠️ {product_count} products found"
    elif product_count == 1:
        level = "MEDIUM"
        verdict = f"🟡 1 product ({products[0]['domain']})"
    elif forum_count >= 3:
        level = "LOW"
        verdict = f"✅ {forum_count} forums, 0 products — clear gap"
    elif forum_count >= 1:
        level = "LOW"
        verdict = f"✅ Forums dominate, no products"
    else:
        level = "LOW"
        verdict = f"✅ No products found"

    return {
        "competition": level,
        "competition_score": comp_score,
        "product_count": product_count,
        "forum_count": forum_count,
        "listicle_count": listicle_count,
        "products_found": [p["domain"] for p in products],
        "top_domains": [extract_domain(r.get("url", "")) for r in results[:5]],
        "verdict": verdict,
    }


def check_competition_batch(queries, max_checks=50):
    """Run competition check on a batch of queries."""
    if not BRAVE_API_KEY:
        print("\n⚠ BRAVE_SEARCH_API_KEY not set. Skipping competition check.")
        print("  Get a free key at: https://api-dashboard.search.brave.com/register")
        print("  Then: export BRAVE_SEARCH_API_KEY=your_key")
        return {}

    results = {}
    total = min(len(queries), max_checks)
    print(f"\n🔍 Phase 3: Competition check via Brave Search ({total} queries)...")

    for i, query in enumerate(queries[:max_checks]):
        print(f"   [{i+1}/{total}] {query[:60]}...")
        results[query] = analyze_competition(query)
        time.sleep(1.2)  # ~50 queries/minute, well within limits

    # Summary
    low = sum(1 for r in results.values() if r.get("competition") == "LOW")
    med = sum(1 for r in results.values() if r.get("competition") == "MEDIUM")
    high = sum(1 for r in results.values() if r.get("competition") in ("HIGH", "SATURATED"))
    print(f"\n   Competition results: ✅ {low} LOW | 🟡 {med} MEDIUM | ❌ {high} HIGH/SATURATED")

    return results


def google_autocomplete(query, lang="en", country="US"):
    """
    Free Google Autocomplete API. Returns list of suggestions.
    No API key needed. Very generous rate limits.
    """
    params = urllib.parse.urlencode({
        "client": "firefox",
        "q": query,
        "hl": lang,
        "gl": country,
    })
    url = f"https://suggestqueries.google.com/complete/search?{params}"

    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                       "AppleWebKit/537.36 (KHTML, like Gecko) "
                       "Chrome/120.0.0.0 Safari/537.36",
    })

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode("utf-8"))
            # Response format: [query, [suggestions], ...]
            if isinstance(data, list) and len(data) >= 2:
                return data[1]
            return []
    except Exception as e:
        print(f"  ⚠ Autocomplete error for '{query}': {e}", file=sys.stderr)
        return []


def alphabet_soup(prefix, lang="en", country="US", depth="quick"):
    """
    Expand a prefix with a-z suffix to discover long-tail suggestions.
    'quick' = a,e,i,o,u,s,t,n (8 common letters)
    'medium' = a-m (13 letters)
    'full' = a-z (26 letters)
    """
    if depth == "quick":
        letters = list("aeiourstn")
    elif depth == "medium":
        letters = list("abcdefghijklm")
    else:
        letters = list("abcdefghijklmnopqrstuvwxyz")

    all_suggestions = set()

    # Base query (no letter suffix)
    results = google_autocomplete(prefix.strip(), lang, country)
    for r in results:
        all_suggestions.add(r)

    # Letter expansions
    for letter in letters:
        query = f"{prefix.strip()} {letter}"
        results = google_autocomplete(query, lang, country)
        for r in results:
            all_suggestions.add(r)
        time.sleep(0.3)  # Be polite, but autocomplete is generous

    return list(all_suggestions)


def is_support_question(suggestion):
    """Detect queries that are support/help questions for existing products."""
    s = suggestion.lower()
    # Pattern: "how to [verb] [brand]" or "how do i [verb] on [brand]"
    for brand in KNOWN_BRANDS:
        if brand in s and any(p in s for p in ["how to", "how do i", "how can i"]):
            return True
    return False


def has_software_signal(suggestion):
    """Check if query relates to a digital/software product."""
    s = suggestion.lower()
    # Disqualify physical context first
    if PHYSICAL_CONTEXT_RE.search(s):
        return False
    return bool(SOFTWARE_SIGNALS_RE.search(s))


def estimate_volume_tier(avg_interest):
    """Convert Google Trends avg interest (0-100) to a volume tier."""
    if avg_interest is None:
        return "?"
    if avg_interest >= 60:
        return "HIGH"   # likely >10K searches/mo
    if avg_interest >= 30:
        return "MEDIUM"  # likely 1K-10K
    if avg_interest >= 10:
        return "LOW"     # likely 100-1K
    return "TINY"        # likely <100


def estimate_monthly_searches(avg_interest):
    """Rough monthly search estimate from Google Trends interest.
    Calibrated: interest 100 ≈ 50K-100K, interest 50 ≈ 5K-10K.
    This is a very rough proxy — real data from Keyword Planner will replace this."""
    if avg_interest is None:
        return None
    # Exponential mapping: interest 0-100 → ~10 to ~100K searches
    import math
    return int(10 * math.exp(avg_interest * 0.092))  # 0→10, 25→1K, 50→10K, 75→100K


def estimate_revenue_potential(monthly_searches, competition_score, category):
    """Estimate monthly revenue potential for a product in this niche.
    Model: revenue ∝ searches × conversion × ARPU, discounted by competition.
    Returns (estimate_usd, tier_label)."""
    if monthly_searches is None:
        return None, "?"

    cpc = CPC_ESTIMATES.get(category, CPC_ESTIMATES["general"])

    # Assume: 2% of searchers try the product, 5% convert to paid, $10/mo avg
    # But discount heavily by competition (more competitors = less share)
    competition_discount = max(0.05, 1 - (competition_score / 100))
    potential_users = monthly_searches * 0.02 * competition_discount
    monthly_revenue = potential_users * 0.05 * 10  # 5% conversion × $10 ARPU

    # Alternative: ad revenue model using CPC
    ad_revenue = monthly_searches * 0.03 * cpc * competition_discount  # 3% CTR

    # Take the higher of the two models
    estimate = max(monthly_revenue, ad_revenue)

    if estimate >= 10000:
        tier = "$$$$"
    elif estimate >= 1000:
        tier = "$$$"
    elif estimate >= 100:
        tier = "$$"
    elif estimate >= 10:
        tier = "$"
    else:
        tier = "~"

    return int(estimate), tier


def score_suggestion(suggestion, prefix_category, software_only=False):
    """Score a suggestion for product opportunity potential (0-10)."""
    s = suggestion.lower()
    score = 0

    # Skip noise
    if NOISE_RE.search(s):
        return -1

    # Skip very short queries (usually too generic)
    if len(s.split()) < 3:
        return 0

    # Skip support questions for existing products
    if is_support_question(s):
        return 0

    # Software-only filter
    if software_only and not has_software_signal(s):
        return 0

    # Product-seeking signals
    for signal in STRONG_PRODUCT_SIGNALS:
        if signal in s:
            score += 2
            break

    # Problem signals
    for signal in STRONG_PROBLEM_SIGNALS:
        if signal in s:
            score += 1
            break

    # Prefix category bonuses
    if prefix_category == "alternative_seeking":
        score += 3  # High intent: user actively looking for alternatives
    elif prefix_category == "product_search":
        score += 2
    elif prefix_category == "frustration":
        score += 2  # Frustration = opportunity
    elif prefix_category == "problem_signal":
        score += 1

    # Specificity bonus (longer = more specific = better)
    word_count = len(s.split())
    if word_count >= 5:
        score += 1
    if word_count >= 7:
        score += 1

    # "free" or "without" = existing solutions are paid/limited
    if "free" in s or "without" in s or "no subscription" in s:
        score += 1

    # "2025" or "2026" = recent search intent
    if "2025" in s or "2026" in s:
        score += 1

    return min(score, 10)


def validate_with_trends(queries, pytrends_instance, country="US"):
    """
    Check if top-scored queries are growing in Google Trends.
    Returns dict of query -> trend_data.
    """
    validated = {}

    for query in queries:
        try:
            pytrends_instance.build_payload(
                [query],
                cat=0,
                timeframe="today 3-m",
                geo=country
            )
            time.sleep(8)  # pytrends needs careful rate limiting

            df = pytrends_instance.interest_over_time()
            if df.empty:
                validated[query] = {"trend": "no_data", "growth": 0}
                continue

            values = df[query].tolist()
            if len(values) < 4:
                validated[query] = {"trend": "insufficient", "growth": 0}
                continue

            # Compare first quarter vs last quarter
            q1 = sum(values[:len(values)//4]) / max(len(values)//4, 1)
            q4 = sum(values[-len(values)//4:]) / max(len(values)//4, 1)

            if q1 > 0:
                growth = int(((q4 - q1) / q1) * 100)
            elif q4 > 0:
                growth = 999  # New query
            else:
                growth = 0

            if growth > 50:
                trend = "rising"
            elif growth > 0:
                trend = "growing"
            elif growth > -20:
                trend = "stable"
            else:
                trend = "declining"

            validated[query] = {
                "trend": trend,
                "growth": growth,
                "avg_interest": int(sum(values) / len(values)),
                "recent_interest": int(sum(values[-3:]) / 3) if len(values) >= 3 else 0,
            }

        except Exception as e:
            validated[query] = {"trend": "error", "growth": 0, "error": str(e)}

    return validated


def run_discovery(args, output_dir):
    """Main discovery pipeline."""
    lang = args.lang
    country = args.country
    depth = args.depth
    skip_trends = args.skip_trends

    print(f"\n{'='*60}")
    print(f"  OPPORTUNITY FINDER")
    print(f"  Language: {lang} | Country: {country} | Depth: {depth}")
    print(f"{'='*60}\n")

    # Step 1: Determine which prefixes and niches to scan
    niches = args.niche.split(",") if args.niche else list(NICHE_SEEDS.keys())

    software_only = getattr(args, 'software_only', False)
    all_suggestions = []  # (suggestion, prefix_category, score, source_prefix)

    # Step 2: Run intent-prefix + alphabet soup discovery
    total_prefixes = sum(len(v) for v in INTENT_PREFIXES.values())
    total_niches = sum(len(NICHE_SEEDS.get(n, [])) for n in niches if n in NICHE_SEEDS)
    print(f"📡 Phase 1: Google Autocomplete discovery")
    print(f"   {total_prefixes} intent prefixes × alphabet soup")
    if total_niches:
        print(f"   + {total_niches} niche-specific seeds")
    print()

    # 2a: Intent prefix discovery
    seen = set()
    for category, prefixes in INTENT_PREFIXES.items():
        print(f"  🔍 Scanning '{category}' ({len(prefixes)} prefixes)...")
        for prefix in prefixes:
            suggestions = alphabet_soup(prefix, lang, country, depth)
            for s in suggestions:
                s_lower = s.lower().strip()
                if s_lower in seen:
                    continue
                seen.add(s_lower)
                score = score_suggestion(s, category, software_only)
                if score > 0:
                    all_suggestions.append((s, category, score, prefix.strip()))
        print(f"     Found {len(all_suggestions)} candidates so far")

    # 2b: Niche-specific discovery
    for niche in niches:
        seeds = NICHE_SEEDS.get(niche)
        if not seeds:
            print(f"  ⚠ Unknown niche '{niche}', skipping")
            continue
        print(f"\n  🎯 Niche: {niche} ({len(seeds)} seeds)...")
        for seed in seeds:
            # Try each seed as a standalone autocomplete query
            results = google_autocomplete(seed, lang, country)
            for r in results:
                r_lower = r.lower().strip()
                if r_lower in seen:
                    continue
                seen.add(r_lower)
                score = score_suggestion(r, "niche_seed", software_only)
                if score > 0:
                    all_suggestions.append((r, "niche_seed", score, seed))
            time.sleep(0.3)

            # Also try "best [seed]", "app for [seed]"
            for intent in ["best ", "app for ", "how to "]:
                results = google_autocomplete(f"{intent}{seed}", lang, country)
                for r in results:
                    r_lower = r.lower().strip()
                    if r_lower in seen:
                        continue
                    seen.add(r_lower)
                    score = score_suggestion(r, "product_search", software_only)
                    if score > 0:
                        all_suggestions.append((r, "product_search", score, f"{intent}{seed}"))
                time.sleep(0.3)

    # Step 3: Sort by score and deduplicate
    all_suggestions.sort(key=lambda x: -x[2])

    print(f"\n📊 Phase 1 complete: {len(all_suggestions)} scored suggestions")
    print(f"   Score distribution:")
    for s in range(10, 0, -1):
        count = sum(1 for x in all_suggestions if x[2] == s)
        if count:
            print(f"     Score {s}: {count} queries")

    # Step 4: Google Trends validation + volume proxy for top candidates
    # By default, validate top 20 (uses ~20 API calls, ~3 min).
    # With --skip-trends, skip entirely.
    top_for_trends = [x for x in all_suggestions if x[2] >= 5][:20]
    trends_data = {}

    if not skip_trends and top_for_trends and HAS_PYTRENDS:
        print(f"\n📈 Phase 2: Google Trends volume + growth ({len(top_for_trends)} queries)...")
        try:
            pytrends = TrendReq(hl=lang, tz=360)
            trends_data = validate_with_trends(
                [x[0] for x in top_for_trends],
                pytrends,
                country
            )
            # Show volume insights
            with_volume = [(q, d) for q, d in trends_data.items() if d.get("avg_interest", 0) > 0]
            if with_volume:
                print(f"   Volume proxy results (Google Trends avg interest):")
                for q, d in sorted(with_volume, key=lambda x: -x[1].get("avg_interest", 0))[:5]:
                    est = estimate_monthly_searches(d.get("avg_interest"))
                    print(f"     [{d['avg_interest']:3d}] ~{est:,}/mo  {q[:50]}")
        except Exception as e:
            print(f"  ⚠ Trends validation failed: {e}")
            print(f"  Continuing with autocomplete data only.")
    elif not skip_trends and not HAS_PYTRENDS:
        print(f"\n⚠ pytrends not installed. Skipping trends validation.")
        print(f"  Install with: pip install pytrends 'urllib3<2'")
    elif skip_trends:
        print(f"\n⏭  Skipping trends validation (--skip-trends)")

    # Step 5: Build final results
    results = []
    for suggestion, category, score, source in all_suggestions:
        trend = trends_data.get(suggestion, {})
        # Boost score if trends show growth
        final_score = score
        if trend.get("trend") == "rising":
            final_score += 3
        elif trend.get("trend") == "growing":
            final_score += 1
        elif trend.get("trend") == "declining":
            final_score -= 2

        avg_interest = trend.get("avg_interest", None)
        est_searches = estimate_monthly_searches(avg_interest)

        results.append({
            "query": suggestion,
            "category": category,
            "base_score": score,
            "final_score": final_score,
            "source_prefix": source,
            "trend": trend.get("trend", "unvalidated"),
            "growth_pct": trend.get("growth", None),
            "avg_interest": avg_interest,
            "est_searches": est_searches,
            "volume_tier": estimate_volume_tier(avg_interest),
        })

    results.sort(key=lambda x: -x["final_score"])

    # Step 5b: Competition check for top opportunities
    skip_competition = getattr(args, 'skip_competition', False)
    if not skip_competition and BRAVE_API_KEY:
        high_score_queries = [r["query"] for r in results if r["final_score"] >= 6]
        competition_data = check_competition_batch(high_score_queries, max_checks=50)

        # Enrich results with competition data and adjust scores
        for r in results:
            comp = competition_data.get(r["query"])
            if comp:
                r["competition"] = comp.get("competition", "unknown")
                r["competition_score"] = comp.get("competition_score", 50)
                r["competition_verdict"] = comp.get("verdict", "")
                r["products_found"] = comp.get("products_found", [])
                r["top_domains"] = comp.get("top_domains", [])

                # Revenue estimation
                niche_cat = args.niche.split(",")[0] if args.niche else "general"
                rev_est, rev_tier = estimate_revenue_potential(
                    r.get("est_searches"),
                    r.get("competition_score", 50),
                    niche_cat,
                )
                r["revenue_estimate"] = rev_est
                r["revenue_tier"] = rev_tier

                # Boost LOW competition, penalize SATURATED
                if comp.get("competition") == "LOW":
                    r["final_score"] += 2
                elif comp.get("competition") == "SATURATED":
                    r["final_score"] -= 3
                elif comp.get("competition") == "HIGH":
                    r["final_score"] -= 1

        results.sort(key=lambda x: -x["final_score"])
    elif not skip_competition:
        print("\n⏭  No BRAVE_SEARCH_API_KEY — skipping competition check.")
        print("  Set: export BRAVE_SEARCH_API_KEY=your_key")

    # Step 6: Output
    if args.json:
        output_path = os.path.join(output_dir, f"opportunities-{datetime.now(timezone.utc).strftime('%Y-%m-%d')}.json")
        os.makedirs(output_dir, exist_ok=True)
        with open(output_path, "w") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print(f"\n💾 JSON saved to {output_path}")
    else:
        output_path = os.path.join(output_dir, f"opportunities-{datetime.now(timezone.utc).strftime('%Y-%m-%d')}.md")
        os.makedirs(output_dir, exist_ok=True)
        write_markdown_report(results, output_path, args)
        print(f"\n💾 Report saved to {output_path}")

    # Print summary
    print(f"\n{'='*60}")
    print(f"  RESULTS SUMMARY")
    print(f"{'='*60}")

    high = [r for r in results if r["final_score"] >= 6]
    medium = [r for r in results if 4 <= r["final_score"] < 6]
    rising = [r for r in results if r.get("trend") == "rising"]

    print(f"\n  🔥 High opportunity (score ≥ 6): {len(high)}")
    for r in high[:15]:
        trend_str = f" [{r['trend']}]" if r['trend'] != "unvalidated" else ""
        growth_str = f" +{r['growth_pct']}%" if r.get("growth_pct") and r["growth_pct"] > 0 else ""
        comp_str = f" [{r['competition']}:{r.get('competition_score', '')}]" if r.get("competition") else ""
        vol_str = f" ~{r['est_searches']:,}/mo" if r.get("est_searches") else ""
        rev_str = f" {r['revenue_tier']}" if r.get("revenue_tier") and r["revenue_tier"] != "?" else ""
        print(f"     [{r['final_score']}] {r['query']}{comp_str}{vol_str}{rev_str}{trend_str}{growth_str}")

    print(f"\n  📊 Medium opportunity (score 4-5): {len(medium)}")
    for r in medium[:10]:
        trend_str = f" [{r['trend']}]" if r['trend'] != "unvalidated" else ""
        print(f"     [{r['final_score']}] {r['query']}{trend_str}")

    if rising:
        print(f"\n  📈 Rising in trends: {len(rising)}")
        for r in rising[:10]:
            print(f"     +{r['growth_pct']}% {r['query']}")

    print(f"\n  Total opportunities: {len(results)}")
    print()


def write_markdown_report(results, path, args):
    """Write a structured Markdown report."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    high = [r for r in results if r["final_score"] >= 6]
    medium = [r for r in results if 4 <= r["final_score"] < 6]
    low = [r for r in results if r["final_score"] < 4]
    rising = [r for r in results if r.get("trend") == "rising"]

    with open(path, "w") as f:
        f.write(f"# Opportunity Finder Report\n\n")
        f.write(f"**Generated**: {now}\n")
        f.write(f"**Language**: {args.lang} | **Country**: {args.country} | **Depth**: {args.depth}\n")
        if args.niche:
            f.write(f"**Niches**: {args.niche}\n")
        f.write(f"**Trends validation**: {'skipped' if args.skip_trends else 'enabled'}\n\n")

        f.write(f"## Summary\n\n")
        f.write(f"| Metric | Count |\n|---|---|\n")
        f.write(f"| Total suggestions scored | {len(results)} |\n")
        f.write(f"| High opportunity (≥6) | {len(high)} |\n")
        f.write(f"| Medium opportunity (4-5) | {len(medium)} |\n")
        f.write(f"| Rising in trends | {len(rising)} |\n\n")

        # Check if any results have competition data
        has_competition = any(r.get("competition") for r in results)
        has_volume = any(r.get("est_searches") for r in results)
        has_revenue = any(r.get("revenue_estimate") for r in results)

        if high:
            f.write(f"## 🔥 High Opportunity (score ≥ 6)\n\n")
            f.write(f"These queries show strong product-seeking intent and/or growth.\n\n")
            if has_competition:
                # Full table with all metrics
                header = "| Score | Query | Comp | Comp Score |"
                sep =    "|---|---|---|---|"
                if has_volume:
                    header += " Vol/mo | Vol Tier |"
                    sep += "---|---|"
                if has_revenue:
                    header += " Rev $/mo | Rev Tier |"
                    sep += "---|---|"
                header += " Category |"
                sep += "---|"
                f.write(f"{header}\n{sep}\n")
                for r in high:
                    comp = r.get("competition", "-")
                    comp_score = r.get("competition_score", "-")
                    line = f"| {r['final_score']} | {r['query']} | {comp} | {comp_score} |"
                    if has_volume:
                        vol = f"{r['est_searches']:,}" if r.get("est_searches") else "-"
                        line += f" {vol} | {r.get('volume_tier', '?')} |"
                    if has_revenue:
                        rev = f"${r['revenue_estimate']:,}" if r.get("revenue_estimate") else "-"
                        line += f" {rev} | {r.get('revenue_tier', '?')} |"
                    line += f" {r['category']} |"
                    f.write(f"{line}\n")
            else:
                f.write(f"| Score | Query | Category | Trend | Growth | Source |\n")
                f.write(f"|---|---|---|---|---|---|\n")
                for r in high:
                    growth = f"+{r['growth_pct']}%" if r.get("growth_pct") and r["growth_pct"] > 0 else "-"
                    f.write(f"| {r['final_score']} | {r['query']} | {r['category']} | {r['trend']} | {growth} | {r['source_prefix']} |\n")
            f.write("\n")

        # Low competition gems section
        low_comp = [r for r in results if r.get("competition") == "LOW" and r["final_score"] >= 4]
        if low_comp:
            f.write(f"## 💎 Low Competition Gems\n\n")
            f.write(f"These queries have product-seeking intent AND no clear existing product.\n\n")
            header = "| Score | Query | Comp Score | Verdict |"
            sep = "|---|---|---|---|"
            if has_volume:
                header += " Vol/mo |"
                sep += "---|"
            if has_revenue:
                header += " Rev $/mo |"
                sep += "---|"
            header += " Top Domains |"
            sep += "---|"
            f.write(f"{header}\n{sep}\n")
            for r in low_comp[:25]:
                domains = ", ".join(r.get("top_domains", [])[:3])
                line = f"| {r['final_score']} | **{r['query']}** | {r.get('competition_score', '-')} | {r.get('competition_verdict', '-')} |"
                if has_volume:
                    vol = f"{r['est_searches']:,}" if r.get("est_searches") else "-"
                    line += f" {vol} |"
                if has_revenue:
                    rev = f"${r['revenue_estimate']:,}" if r.get("revenue_estimate") else "-"
                    line += f" {rev} |"
                line += f" {domains} |"
                f.write(f"{line}\n")
            f.write("\n")

        if rising:
            f.write(f"## 📈 Rising Queries\n\n")
            f.write(f"Queries confirmed growing in Google Trends:\n\n")
            f.write(f"| Growth | Query | Score | Avg Interest |\n")
            f.write(f"|---|---|---|---|\n")
            for r in sorted(rising, key=lambda x: -(x.get("growth_pct") or 0)):
                f.write(f"| +{r['growth_pct']}% | {r['query']} | {r['final_score']} | {r.get('avg_interest', '-')} |\n")
            f.write("\n")

        if medium:
            f.write(f"## 📊 Medium Opportunity (score 4-5)\n\n")
            f.write(f"| Score | Query | Category | Source |\n")
            f.write(f"|---|---|---|---|\n")
            for r in medium[:30]:
                f.write(f"| {r['final_score']} | {r['query']} | {r['category']} | {r['source_prefix']} |\n")
            if len(medium) > 30:
                f.write(f"\n*...and {len(medium) - 30} more*\n")
            f.write("\n")

        # Category breakdown
        categories = defaultdict(list)
        for r in results:
            categories[r["category"]].append(r)

        f.write(f"## Category Breakdown\n\n")
        for cat, items in sorted(categories.items(), key=lambda x: -len(x[1])):
            high_in_cat = sum(1 for i in items if i["final_score"] >= 6)
            f.write(f"- **{cat}**: {len(items)} total, {high_in_cat} high-opportunity\n")
        f.write("\n")

        f.write(f"---\n\n")
        f.write(f"## Methodology\n\n")
        f.write(f"1. **Google Autocomplete** queries with product-intent prefixes ")
        f.write(f"(\"best app for...\", \"alternative to...\", \"how to...\", etc.)\n")
        f.write(f"2. **Alphabet soup expansion** for each prefix (append a-z)\n")
        f.write(f"3. **Intent scoring** based on product signals, problem indicators, specificity\n")
        f.write(f"4. **Google Trends validation** for top candidates (growth over 3 months)\n")
        f.write(f"5. **Brave Search competition check** for top opportunities (product vs forum analysis)\n")


def main():
    parser = argparse.ArgumentParser(
        description="Find product opportunities via Google Autocomplete + Trends"
    )
    parser.add_argument(
        "--niche",
        help="Comma-separated niches to focus on (events,productivity,health,finance,creative,local). "
             "Default: all niches.",
    )
    parser.add_argument(
        "--lang", default="en",
        help="Language code for autocomplete (default: en)"
    )
    parser.add_argument(
        "--country", default="US",
        help="Country code (default: US)"
    )
    parser.add_argument(
        "--depth", default="quick", choices=["quick", "medium", "full"],
        help="Alphabet soup depth: quick (8 letters), medium (13), full (26)"
    )
    parser.add_argument(
        "--skip-trends", action="store_true",
        help="Skip Google Trends validation (faster, autocomplete only)"
    )
    parser.add_argument(
        "--skip-competition", action="store_true",
        help="Skip Brave Search competition check"
    )
    parser.add_argument(
        "--software-only", action="store_true",
        help="Filter to software/digital product opportunities only (exclude physical products)"
    )
    parser.add_argument(
        "--json", action="store_true",
        help="Output as JSON instead of Markdown"
    )
    parser.add_argument(
        "--output-dir",
        help=f"Output directory (default: {OUTPUT_DIR})"
    )

    args = parser.parse_args()

    if args.output_dir:
        run_discovery(args, args.output_dir)
    else:
        run_discovery(args, OUTPUT_DIR)


if __name__ == "__main__":
    main()
