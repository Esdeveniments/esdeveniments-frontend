#!/usr/bin/env python3
"""
Daily competitor benchmark: esdeveniments.cat against other Catalan event sites,
from their public pages only.

Per site it reads the sitemaps (pages, event pages, lastmod dates), a stable
sample of event pages (Event JSON-LD, canonical, breadcrumbs, hreflang, words,
meta description, size and time to the response headers) and the home page
(size and time to the response headers). With CRUX_API_KEY set it also asks
Google's Chrome UX Report for the site's real-user speed. The JSON feeds the
admin dashboard's SEO > Competitors view.

Politeness: an honest user agent, robots.txt honored (RFC 9309 matching and
Crawl-delay), at least one second between requests to a host, one worker per
host, hard caps on files and bytes, and only the site's own hosts are fetched
(Google's API is the one other host, and it is asked about the origin, never
the site's pages). A site that answers 401, 403 or 429 is recorded as blocked
and left alone; the script never retries or works around it. A redirect is
followed one request at a time, so each hop meets the same rules.

Usage:
  python3 scripts/competitor-benchmark.py --output competitor-benchmark.json
  python3 scripts/competitor-benchmark.py --only vine,timeout --sample 6
  CRUX_API_KEY=... python3 scripts/competitor-benchmark.py
"""

import argparse
import hashlib
import heapq
import http.client
import json
import os
import re
import statistics
import sys
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
import zlib
from collections import deque
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from html.parser import HTMLParser
from typing import NamedTuple
from urllib.parse import quote, unquote, urljoin, urlparse

# ─── CONFIGURATION ───
USER_AGENT = "EsdevenimentsBenchmark/1.0 (+https://www.esdeveniments.cat/)"
PRODUCT_TOKEN = "esdevenimentsbenchmark"  # what robots.txt groups are matched against
MIN_DELAY = 1.0  # seconds between requests to one host
MAX_CRAWL_DELAY = 30.0  # a site asking for more gets this much
REQUEST_TIMEOUT = 20
SITEMAP_TIMEOUT = 60  # sitemaps are built on request: our festa major one takes about 26 s on a cold origin
SITE_SECONDS = 900  # wall-clock budget per site
MAX_SITEMAPS = 200  # sitemap files read per site
MAX_SITEMAP_BYTES = 60_000_000  # decoded; the sitemap protocol allows 50 MB
MAX_PAGE_BYTES = 5_000_000
NOTED_SITEMAPS = 3  # unreadable sitemap files a site's notes name; the rest are counted
SAMPLE_SIZE = 12  # event pages read per site
HOME_RUNS = 3  # home page requests; the response time is their median
FRESH_DAYS = 30  # a lastmod this recent counts as fresh
RECENT_DAYS = 90  # event pages sampled from this window when there are enough
BLOCKED_STATUSES = (401, 403, 429)
REDIRECT_STATUSES = (301, 302, 303, 307, 308)
MAX_REDIRECTS = 5  # followed per page; RFC 9309 asks for at least five on robots.txt
SECTIONS = ("home", "catalogue", "event_pages")  # what each site's result measures from its own pages
EVENT_PROPS = ("startDate", "endDate", "location", "geo", "image", "offers", "description")
EVENT_TYPES = {"Festival", "Hackathon", "CourseInstance", "EventSeries"}
NESTED_NODES = ("@graph", "mainEntity", "breadcrumb")  # JSON-LD keys that hold more nodes
CRUX_URL = "https://chromeuxreport.googleapis.com/v1/records:queryRecord"
CRUX_METRICS = {  # our name -> the Chrome UX Report's
    "lcp": "largest_contentful_paint",
    "inp": "interaction_to_next_paint",
    "cls": "cumulative_layout_shift",
}


@dataclass(frozen=True)
class Site:
    id: str
    name: str
    home: str
    sitemap: str
    event_url: str | None = None  # regex on the URL path that marks an event page
    event_sitemap: str | None = None  # regex on a child sitemap URL whose pages are all events
    ours: bool = False


# Event pages are counted once per event: the Catalan URL, not its es/en copies.
SITES = (
    Site("esdeveniments", "esdeveniments.cat", "https://www.esdeveniments.cat/",
         "https://www.esdeveniments.cat/sitemap.xml", event_url=r"^/e/", ours=True),
    Site("vine", "vine.cat", "https://vine.cat/",
         "https://vine.cat/sitemap-index.xml", event_url=r"^/esdeveniment/"),
    Site("femturisme", "femturisme.cat", "https://femturisme.cat/",
         "https://femturisme.cat/sitemaps/sitemap.xml", event_url=r"^/agenda/[^/]+$"),
    Site("surtdecasa", "surtdecasa.cat", "https://surtdecasa.cat/",
         "https://surtdecasa.cat/sitemap.xml", event_url=r"^/[^/]+/agenda/\d{4}/"),
    Site("timeout", "timeout.cat", "https://www.timeout.cat/",
         "https://www.timeout.cat/barcelona/ca/sitemap.xml.gz"),
    Site("festacatalunya", "festacatalunya.cat", "https://www.festacatalunya.cat/",
         "https://www.festacatalunya.cat/sitemap.xml", event_sitemap=r"/sitemap-events-"),
    Site("gencat", "agenda.cultura.gencat.cat", "https://agenda.cultura.gencat.cat/",
         "https://agenda.cultura.gencat.cat/sitemap.xml", event_url=r"^/ca/activitat\.html/"),
)


# ─── HTTP ───
class FetchError(Exception):
    """The request got no usable answer (network, TLS, timeout, broken gzip)."""


class Stop(Exception):
    """No more requests to this site, whatever is still to read."""


class Blocked(Stop):
    """The site refused us (401, 403, 429): we leave it alone and record it."""


class OutOfTime(Stop):
    """The site's time budget is spent."""


class Response(NamedTuple):
    status: int
    headers: dict
    body: bytes  # decoded, at most `limit` bytes
    seconds: float  # until the response headers arrived
    truncated: bool
    url: str  # where the answer came from, after any redirects


class _NoRedirects(urllib.request.HTTPRedirectHandler):
    """Hands every redirect back as an answer (urllib then raises the 3xx as an
    HTTPError), so `fetch` sends each hop itself."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def _ascii_url(url, encoding="utf-8"):
    """Percent-encodes what a sitemap may carry unescaped (accents, spaces), keeping existing escapes.
    `encoding` is how a character becomes bytes: a Location header, which http.client
    decodes as Latin-1, holds its raw bytes as Latin-1 characters."""
    return quote(url, safe=":/?#[]@!$&'()*+,;=%~-._", encoding=encoding)


def _decode(raw, encoding, limit):
    """Gunzips (by header or magic bytes) without ever holding more than `limit`."""
    if encoding.lower() == "gzip" or raw[:2] == b"\x1f\x8b":
        try:
            data = zlib.decompressobj(16 + zlib.MAX_WBITS).decompress(raw, limit + 1)
        except zlib.error as error:
            raise FetchError(f"broken gzip: {error}") from error
    else:
        data = raw
    return data[:limit], len(data) > limit


class Client:
    """One site's requests: spaced out, gzip-aware, size-capped, on its own hosts."""

    def __init__(self, hosts, delay=MIN_DELAY, seconds=SITE_SECONDS):
        self.hosts = frozenset(hosts)
        self.delay = delay
        self.deadline = time.monotonic() + seconds
        self.requests = 0
        self.stopped = None  # once set, every later request raises it without going out
        self._finished = float("-inf")  # when the last request ended
        self._opener = urllib.request.build_opener(_NoRedirects)

    def get(self, url, limit, timeout=REQUEST_TIMEOUT):
        parts = urlparse(url)
        if parts.scheme not in ("http", "https") or parts.hostname not in self.hosts:
            raise FetchError(f"not one of the site's own URLs: {url}")
        response = None
        for attempt in range(2):  # one retry, for a failed request or a 5xx
            self._wait()
            try:
                response = self._request(_ascii_url(url), limit, timeout)
            except FetchError:
                if attempt:
                    raise
                continue
            if response.status in BLOCKED_STATUSES:
                self.stopped = Blocked(f"{url} answered {response.status}")
                raise self.stopped
            if response.status < 500:
                break
        return response

    def _wait(self):
        if self.stopped:
            raise self.stopped
        if time.monotonic() > self.deadline:
            self.stopped = OutOfTime("the time budget ran out")
            raise self.stopped
        pause = self._finished + self.delay - time.monotonic()
        if pause > 0:
            time.sleep(pause)

    def _request(self, url, limit, timeout):
        request = urllib.request.Request(url, headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Encoding": "gzip",
        })
        self.requests += 1
        started = time.monotonic()
        try:
            try:
                handle = self._opener.open(request, timeout=timeout)
            except urllib.error.HTTPError as error:
                handle = error  # a status line is still an answer
            seconds = time.monotonic() - started
            with handle:
                status, final_url = handle.status, handle.geturl()
                headers = {key.lower(): value for key, value in handle.headers.items()}
                # A refusal's body is never read: if it cannot be, `get` must still see the status.
                raw = b"" if status in BLOCKED_STATUSES else handle.read(limit + 1)
        except (OSError, http.client.HTTPException, ValueError) as error:
            raise FetchError(str(error) or type(error).__name__) from error
        finally:
            self._finished = time.monotonic()
        body, truncated = _decode(raw, headers.get("content-encoding", ""), limit)
        return Response(status, headers, body, seconds, truncated or len(raw) > limit, final_url)


# ─── ROBOTS.TXT (RFC 9309) ───
def _normalized(path):
    """A rule or a request path the way RFC 9309 compares them: non-ASCII characters
    percent-encoded, an escaped unreserved character decoded, other escapes in upper
    case. An escaped reserved character (`%2F`, `%25`) stays as it is."""
    def unescaped(match):
        char = chr(int(match.group(1), 16))
        # quote() leaves exactly RFC 3986's unreserved characters alone
        return char if quote(char, safe="") == char else match.group().upper()
    return re.sub(r"%([0-9A-Fa-f]{2})", unescaped, _ascii_url(path))


def _pattern(value):
    anchored = value.endswith("$")
    body = value[:-1] if anchored else value
    regex = "".join(".*" if char == "*" else re.escape(char) for char in body)
    return re.compile(regex + ("$" if anchored else ""))


class Robots:
    """What robots.txt lets our product token fetch: the longest matching rule
    wins, Allow wins a tie, `*` matches any run of characters and a trailing `$`
    anchors the end. Without a group for the token, the `*` group applies."""

    def __init__(self, text, token=PRODUCT_TOKEN):
        groups = []  # [agents, rules, crawl delay]
        after_agent = False
        for line in text.splitlines():
            field, _, value = line.split("#", 1)[0].partition(":")
            field, value = field.strip().lower(), value.strip()
            if field == "user-agent":
                if not after_agent:
                    groups.append([set(), [], None])
                groups[-1][0].add(value.lower())
                after_agent = True
            elif field in ("allow", "disallow") and groups:
                if value:  # an empty Disallow allows everything: no rule
                    groups[-1][1].append((field == "allow", _normalized(value)))
                after_agent = False
            elif field == "crawl-delay" and groups:
                try:
                    groups[-1][2] = float(value)
                except ValueError:
                    pass  # not a number: the group asks for no delay
                after_agent = False
        matching = [g for g in groups if token in g[0]] or [g for g in groups if "*" in g[0]]
        self.rules = [(allow, _pattern(value), len(value)) for g in matching for allow, value in g[1]]
        delays = [g[2] for g in matching if g[2] is not None]
        self.crawl_delay = delays[0] if delays else None

    def allowed(self, path):
        path = _normalized(path)
        best = None  # (rule length, allow)
        for allow, pattern, length in self.rules:
            if pattern.match(path) and (best is None or length > best[0] or (length == best[0] and allow)):
                best = (length, allow)
        return True if best is None else best[1]


def load_robots(client, site):
    response = fetch(client, None, urlparse(site.home)._replace(path="/robots.txt").geturl(), 500_000)
    if response.status >= 500:
        raise FetchError(f"robots.txt answered {response.status}")  # RFC 9309: assume disallowed
    text = response.body.decode("utf-8", "replace") if response.status < 300 else ""
    robots = Robots(text)
    if robots.crawl_delay:
        client.delay = min(max(client.delay, robots.crawl_delay), MAX_CRAWL_DELAY)
    return robots


def fetch(client, robots, url, limit, timeout=REQUEST_TIMEOUT):
    """GET `url`, following redirects one request at a time: each hop is checked
    against robots.txt (`robots` is None for robots.txt itself) and goes through
    the client, which spaces it, counts it and keeps it on the site's own hosts.
    `timeout` is for each hop. `seconds` adds up the hops' own time, not the
    waits between them."""
    seconds = 0.0
    for _ in range(MAX_REDIRECTS + 1):
        if robots is not None:
            parts = urlparse(url)
            path = (parts.path or "/") + (f"?{parts.query}" if parts.query else "")
            if not robots.allowed(path):
                raise FetchError(f"robots.txt disallows {path}")
        response = client.get(url, limit, timeout)
        seconds += response.seconds
        location = response.headers.get("location")
        if response.status not in REDIRECT_STATUSES or not location:
            return response._replace(seconds=seconds)
        url = _ascii_url(urljoin(response.url, location), "iso-8859-1")
    raise FetchError(f"more than {MAX_REDIRECTS} redirects")


# ─── PAGES ───
class PageParser(HTMLParser):
    """Title, meta description, canonical and hreflang links, JSON-LD blocks and visible words."""

    SKIPPED = {"script", "style", "noscript", "template", "svg"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title = ""
        self.description = None
        self.canonical = None
        self.hreflang = set()
        self.jsonld = []
        self.words = 0
        self._skipped = 0
        self._in_title = False
        self._json = None

    def handle_starttag(self, tag, attrs):
        attrs = {key: value or "" for key, value in attrs}
        if tag == "title" and not self.title:
            self._in_title = True
        elif tag == "meta" and attrs.get("name", "").lower() == "description" and self.description is None:
            self.description = attrs.get("content", "").strip()
        elif tag == "link":
            rel = attrs.get("rel", "").lower().split()
            if "canonical" in rel and self.canonical is None:
                self.canonical = attrs.get("href", "").strip() or None
            elif "alternate" in rel and attrs.get("hreflang"):
                self.hreflang.add(attrs["hreflang"].lower())
        elif tag == "script" and "ld+json" in attrs.get("type", "").lower():
            self._json = []
        if tag in self.SKIPPED:
            self._skipped += 1

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False
        elif tag == "script" and self._json is not None:
            self.jsonld.append("".join(self._json))
            self._json = None
        if tag in self.SKIPPED and self._skipped:
            self._skipped -= 1

    def handle_data(self, data):
        if self._json is not None:
            self._json.append(data)
        elif self._in_title:
            self.title += data
        elif not self._skipped:
            self.words += len(re.findall(r"\w+", data))


def _nodes(data):
    """Every JSON-LD node, following @graph, mainEntity (a WebPage wrapping its Event)
    and breadcrumb (a WebPage embedding its BreadcrumbList)."""
    if isinstance(data, list):
        for item in data:
            yield from _nodes(item)
    elif isinstance(data, dict):
        yield data
        for key in NESTED_NODES:
            yield from _nodes(data.get(key, []))


def _types(node):
    declared = node.get("@type")
    declared = [declared] if isinstance(declared, str) else declared if isinstance(declared, list) else []
    return [t.rsplit("/", 1)[-1].rsplit(":", 1)[-1] for t in declared if isinstance(t, str)]


def _is_event(type_name):
    return type_name.endswith("Event") or type_name in EVENT_TYPES


def _filled(value):
    return value.strip() != "" if isinstance(value, str) else bool(value)


def _event_props(node):
    location = node.get("location")
    places = location if isinstance(location, list) else [location]
    geo = node.get("geo") or any(isinstance(place, dict) and place.get("geo") for place in places)
    return {
        "startDate": _filled(node.get("startDate")),
        "endDate": _filled(node.get("endDate")),
        "location": _filled(location),
        "geo": bool(geo),
        "image": _filled(node.get("image")),
        "offers": _filled(node.get("offers")),
        "description": _filled(node.get("description")),
    }


def _same_page(canonical, url):
    """Whether a canonical link points at `url`: scheme, host and query must match,
    while a relative href, a trailing slash or percent-encoding of the path don't matter."""
    if not canonical:
        return False

    def identity(address):
        parts = urlparse(address)
        return parts.scheme.lower(), parts.netloc.lower(), unquote(parts.path).rstrip("/"), parts.query

    try:
        return identity(urljoin(url, canonical)) == identity(url)
    except ValueError:  # a malformed href, such as an unclosed IPv6 bracket
        return False


def analyze_page(html):
    """What a page declares: title, meta description, canonical link (as written),
    hreflang, JSON-LD types, the properties of its first Event (or None) and its
    visible words."""
    parser = PageParser()
    parser.feed(html)
    parser.close()
    types, event = [], None
    for block in parser.jsonld:
        try:
            data = json.loads(block)
        except (ValueError, RecursionError):  # invalid, or nested deeper than Python parses
            continue
        for node in _nodes(data):
            node_types = _types(node)
            for type_name in node_types:
                if type_name not in types:
                    types.append(type_name)
            if event is None and any(_is_event(t) for t in node_types):
                event = _event_props(node)
    return {
        "title": parser.title.strip(),
        "description": parser.description,
        "canonical": parser.canonical,
        "hreflang": len(parser.hreflang),
        "types": types,
        "event": event,
        "words": parser.words,
    }


def ratio(part, whole):
    return round(part / whole, 4) if whole else None


def measure_home(client, robots, site):
    times, first = [], None
    for _ in range(HOME_RUNS):
        response = fetch(client, robots, site.home, MAX_PAGE_BYTES)
        if response.status != 200:
            break
        times.append(response.seconds)
        first = first or response
    if not first:
        raise FetchError("the home page didn't answer 200")
    page = analyze_page(first.body.decode("utf-8", "replace"))
    return {
        "kb": round(len(first.body) / 1024),
        "ttfb_ms": round(statistics.median(times) * 1000),
        "title_length": len(page["title"]),
        "description_length": len(page["description"]) if page["description"] else None,
        "hreflang": page["hreflang"],
        "json_ld_types": page["types"],
        "words": page["words"],
    }


def measure_event_pages(client, robots, urls):
    """The sample's pages, as far as the site let us read them; FetchError when none could be."""
    pages, failures = [], []
    for url in urls:
        try:
            response = fetch(client, robots, url, MAX_PAGE_BYTES)
            if response.status != 200:
                raise FetchError(f"answered {response.status}")
        except FetchError as error:
            failures.append(f"{url}: {error}")
            continue
        except Stop:
            break
        page = analyze_page(response.body.decode("utf-8", "replace"))
        pages.append({**page, "kb": len(response.body) / 1024, "seconds": response.seconds,
                      "self_canonical": _same_page(page["canonical"], response.url)})
    if not pages:
        example = f" (e.g. {failures[0]})" if failures else ""
        raise FetchError(f"none of the {len(urls)} sampled pages could be read{example}")

    def share(test):
        return ratio(sum(1 for page in pages if test(page)), len(pages))

    lengths = [len(page["description"]) for page in pages if page["description"]]
    return {
        "sampled": len(urls),
        "ok": len(pages),
        "event_json_ld": share(lambda page: page["event"]),
        "props": {prop: share(lambda page: page["event"] and page["event"][prop]) for prop in EVENT_PROPS},
        "avg_words": round(statistics.fmean(page["words"] for page in pages)),
        "avg_kb": round(statistics.fmean(page["kb"] for page in pages)),
        "ttfb_ms": round(statistics.median(page["seconds"] for page in pages) * 1000),
        "description_share": share(lambda page: page["description"]),
        "description_length": round(statistics.median(lengths)) if lengths else None,
        "canonical_share": share(lambda page: page["self_canonical"]),
        "breadcrumb_share": share(lambda page: "BreadcrumbList" in page["types"]),
        "hreflang_share": share(lambda page: page["hreflang"] >= 2),
    }


# ─── SITEMAPS ───
def _local(tag):
    return tag.rsplit("}", 1)[-1]


def parse_sitemap(data):
    """("index" | "urlset", [(loc, lastmod or None)]); ValueError when it isn't a sitemap."""
    if b"<!ENTITY" in data:
        raise ValueError("entity declarations are not accepted")
    try:
        root = ET.fromstring(data)
    except ET.ParseError as error:
        raise ValueError(str(error)) from error
    kind = {"sitemapindex": "index", "urlset": "urlset"}.get(_local(root.tag))
    if not kind:
        raise ValueError(f"not a sitemap: <{_local(root.tag)}>")
    entry = "sitemap" if kind == "index" else "url"
    entries = []
    for node in root:
        if _local(node.tag) != entry:
            continue
        values = {}
        for child in node:
            values.setdefault(_local(child.tag), (child.text or "").strip())
        if values.get("loc"):
            entries.append((values["loc"], values.get("lastmod") or None))
    return kind, entries


def _day(lastmod):
    match = re.match(r"\d{4}-\d{2}-\d{2}", lastmod or "")
    return match.group() if match else None


def pick_sample(candidates, size, today):
    """The `size` event pages with the smallest URL hashes, so the sample changes
    only when a page enters or leaves the pool. The pool is the pages modified in
    the last RECENT_DAYS when there are enough of them, otherwise every event page."""
    since = (today - timedelta(days=RECENT_DAYS)).isoformat()
    recent = [url for url, day in candidates if day and day >= since]
    pool = recent if len(recent) >= size else [url for url, _ in candidates]
    return heapq.nsmallest(size, pool, key=lambda url: hashlib.sha1(url.encode()).digest())


def crawl_catalogue(client, robots, site, today, sample_size, notes):
    """(catalogue, event page sample). The catalogue is None when no sitemap could
    be read, and `complete` is false when a file was unreadable, left out or never
    reached because the site stopped answering. Unreadable and left-out files are
    added to `notes`."""
    event_path = re.compile(site.event_url) if site.event_url else None
    event_map = re.compile(site.event_sitemap) if site.event_sitemap else None
    fresh_since = (today - timedelta(days=FRESH_DAYS)).isoformat()
    queue, seen, skipped = deque([site.sitemap]), {site.sitemap}, set()
    fetched, unread = 0, []
    days, events = {}, set()  # page URL -> its latest lastmod day; the pages that are events
    while queue:
        sitemap = queue.popleft()
        try:
            response = fetch(client, robots, sitemap, MAX_SITEMAP_BYTES, SITEMAP_TIMEOUT)
            if response.status != 200:
                raise FetchError(f"answered {response.status}")
            if response.truncated:
                raise FetchError(f"larger than {MAX_SITEMAP_BYTES // 1_000_000} MB")
            kind, entries = parse_sitemap(response.body)
        except (FetchError, ValueError) as error:
            unread.append(f"sitemap {sitemap}: {error}")
            continue
        except Stop:
            break
        fetched += 1
        if kind == "index":
            for loc, _ in entries:
                if loc in seen or loc in skipped:
                    continue
                if urlparse(loc).hostname not in client.hosts or len(seen) >= MAX_SITEMAPS:
                    skipped.add(loc)  # another host, or more files than we read
                    continue
                seen.add(loc)
                queue.append(loc)
            continue
        all_events = bool(event_map and event_map.search(sitemap))
        for loc, lastmod in entries:
            # a page listed in two files counts once, with its latest lastmod, whichever file comes first
            days[loc] = max(filter(None, (days.get(loc), _day(lastmod))), default=None)
            if all_events or (event_path and event_path.search(urlparse(loc).path)):
                events.add(loc)  # an event page if any file it is listed in says so
    notes.extend(unread[:NOTED_SITEMAPS])
    if len(unread) > NOTED_SITEMAPS:
        notes.append(f"sitemaps unreadable: {len(unread) - NOTED_SITEMAPS} more")
    if skipped:
        notes.append(f"sitemaps left out (another host, or past the {MAX_SITEMAPS}-file cap): {len(skipped)}")
    if not fetched:
        return None, []
    listed = len(seen) + len(skipped)
    dated = [day for day in days.values() if day]
    catalogue = {
        "urls": len(days),
        "event_urls": len(events) if (event_path or event_map) else None,
        "sitemaps": listed,
        "fetched": fetched,
        "complete": fetched == listed,
        "with_lastmod": ratio(len(dated), len(days)),
        "fresh_30": ratio(sum(day >= fresh_since for day in dated), len(dated)),
    }
    return catalogue, pick_sample([(loc, days[loc]) for loc in events], sample_size, today)


# ─── REAL-USER SPEED (CHROME UX REPORT) ───
def fetch_crux(origin, key):
    """Google's Chrome UX Report record for an origin (phones, 28-day window), or
    None when Google has too little traffic for it. Messages never carry the URL,
    which holds the key."""
    body = json.dumps({"origin": origin, "formFactor": "PHONE", "metrics": list(CRUX_METRICS.values())})
    request = urllib.request.Request(f"{CRUX_URL}?key={key}", data=body.encode(),
                                     headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:  # before OSError, which it extends
        if error.code == 404:
            return None
        raise FetchError(f"Chrome UX Report answered {error.code}") from None
    except (OSError, http.client.HTTPException, ValueError) as error:
        raise FetchError(f"Chrome UX Report failed: {type(error).__name__}") from None


def _p75(record, field):
    """A metric's 75th percentile: LCP and INP come as numbers, CLS as a string."""
    try:
        return float(record["record"]["metrics"][field]["percentiles"]["p75"])
    except (KeyError, TypeError, ValueError):
        return None


def measure_crux(site, key):
    """{lcp, inp, cls} at the 75th percentile (None for a metric Google lacks), or
    None when it has no record for the site's origin."""
    parts = urlparse(site.home)
    record = fetch_crux(f"{parts.scheme}://{parts.netloc}", key)
    return {name: _p75(record, field) for name, field in CRUX_METRICS.items()} if record else None


# ─── RUN ───
def _result(site, status, notes, requests=0, seconds=0, sections=None, crux=None):
    return {
        "id": site.id,
        "name": site.name,
        "ours": site.ours,
        "status": status,
        "notes": notes,
        "requests": requests,
        "seconds": seconds,
        **(sections or dict.fromkeys(SECTIONS)),
        "crux": crux,
    }


def collect_site(site, today, sample_size=SAMPLE_SIZE, delay=MIN_DELAY, seconds=SITE_SECONDS, crux_key=None):
    hosts = {urlparse(site.home).hostname, urlparse(site.sitemap).hostname}
    client = Client(hosts, delay, seconds)
    started = time.monotonic()
    notes = []
    sections = dict.fromkeys(SECTIONS)
    sample = []

    def step(name, work):
        try:
            return work()
        except FetchError as error:
            notes.append(f"{name}: {error}")
        except Stop:
            pass  # noted once below, from client.stopped
        return None

    robots = step("robots.txt", lambda: load_robots(client, site))
    if robots:
        sections["home"] = step("home", lambda: measure_home(client, robots, site))
        crawled = step("sitemaps", lambda: crawl_catalogue(client, robots, site, today, sample_size, notes))
        sections["catalogue"], sample = crawled or (None, [])
        if sample:
            sections["event_pages"] = step("event pages", lambda: measure_event_pages(client, robots, sample))
    catalogue = sections["catalogue"]
    if client.stopped:
        notes.append(str(client.stopped))
    if catalogue and catalogue["event_urls"] == 0:
        notes.append("no event URLs matched this site's patterns")
    # Google's data, not the site's: it neither counts toward the status nor depends on being allowed in
    crux = step("crux", lambda: measure_crux(site, crux_key)) if crux_key else None

    if not any(sections.values()):
        status = "blocked" if isinstance(client.stopped, Blocked) else "error"
    elif (
        client.stopped
        or sections["home"] is None
        or catalogue is None
        or not catalogue["complete"]
        or catalogue["event_urls"] == 0
        or (sample and sections["event_pages"] is None)
    ):
        status = "partial"
    else:
        status = "ok"
    return _result(site, status, notes, client.requests, round(time.monotonic() - started, 1), sections, crux)


def run(sites, today, sample_size=SAMPLE_SIZE, delay=MIN_DELAY, crux_key=None):
    def collect(site):
        try:
            return collect_site(site, today, sample_size, delay, crux_key=crux_key)
        except Exception as error:  # a bug on one site must not lose the others
            return _result(site, "error", [f"unexpected {type(error).__name__}: {error}"])

    with ThreadPoolExecutor(max_workers=len(sites)) as pool:
        results = list(pool.map(collect, sites))
    return {
        "meta": {
            "run_date": today.isoformat(),
            "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "user_agent": USER_AGENT,
            "sample_size": sample_size,
        },
        "sites": results,
    }


def summary_line(site):
    catalogue, home = site["catalogue"], site["home"]
    urls = f"{catalogue['urls']:,} urls" if catalogue else "no sitemap"
    events = f", {catalogue['event_urls']:,} events" if catalogue and catalogue["event_urls"] is not None else ""
    page = f", home {home['kb']} KB in {home['ttfb_ms']} ms" if home else ""
    notes = f" ({'; '.join(site['notes'])})" if site["notes"] else ""
    return f"{site['id']:<15} {site['status']:<8} {urls}{events}{page}, {site['requests']} requests{notes}"


def main():
    parser = argparse.ArgumentParser(description="Daily competitor benchmark")
    parser.add_argument("--output", default="competitor-benchmark.json")
    parser.add_argument("--only", help="comma-separated site ids")
    parser.add_argument("--sample", type=int, default=SAMPLE_SIZE, help="event pages read per site")
    args = parser.parse_args()

    wanted = set(args.only.split(",")) if args.only else None
    sites = [site for site in SITES if not wanted or site.id in wanted]
    if not sites:
        sys.exit(f"No site matches --only {args.only}")

    crux_key = os.environ.get("CRUX_API_KEY") or None  # an empty secret counts as unset
    if not crux_key:
        print("CRUX_API_KEY is not set: skipping the Chrome UX Report (real-user speed)")
    report = run(sites, datetime.now(timezone.utc).date(), args.sample, crux_key=crux_key)
    with open(args.output, "w") as handle:
        json.dump(report, handle, indent=2)
    for site in report["sites"]:
        print(summary_line(site))
    if not any(site["status"] in ("ok", "partial") for site in report["sites"]):
        sys.exit("No site could be read")


if __name__ == "__main__":
    main()
