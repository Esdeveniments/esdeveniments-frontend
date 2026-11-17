import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const scriptPath = join(process.cwd(), "scripts", "competitor-benchmark.py");

// Loads the script as `bench` and gives each scenario a local site to crawl:
// `serve()` returns (base URL, routes to fill, request log). Nothing leaves the machine.
const PRELUDE = String.raw`
import gzip, importlib.util, json, sys, threading, time
from datetime import date
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

spec = importlib.util.spec_from_file_location("competitor_benchmark", sys.argv[1])
bench = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bench)
TODAY = date(2026, 11, 17)

def serve():
    routes, log = {}, []
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            log.append({"path": self.path, "host": self.headers.get("Host"), "agent": self.headers.get("User-Agent"), "at": time.monotonic()})
            status, headers, body = routes.get(self.path, (404, {}, b""))
            self.send_response(status)
            for key, value in headers.items():
                self.send_header(key, value)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        def log_message(self, *args):
            pass
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return "http://127.0.0.1:%d" % server.server_port, routes, log

def other_host(base):
    return base.replace("127.0.0.1", "localhost")  # the same server, a host we must not follow to

def ok(body, kind="text/html"):
    return (200, {"Content-Type": kind}, body.encode() if isinstance(body, str) else body)

def page(title, body="", ld=(), description=None, head=""):
    if description is not None:
        head += '<meta name="description" content="%s">' % description
    for block in ld:
        head += '<script type="application/ld+json">%s</script>' % json.dumps(block)
    return "<html><head><title>%s</title>%s</head><body>%s</body></html>" % (title, head, body)

def urlset(rows):
    return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">%s</urlset>' % "".join(
        "<url><loc>%s</loc>%s</url>" % (loc, "<lastmod>%s</lastmod>" % day if day else "") for loc, day in rows)

def index(locs):
    return '<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">%s</sitemapindex>' % "".join(
        "<sitemap><loc>%s</loc></sitemap>" % loc for loc in locs)

OPEN = ok("User-agent: *\nDisallow:\n", "text/plain")

def site_at(base, **kwargs):
    return bench.Site("local", "Local", base + "/", base + "/sitemap.xml", **kwargs)
`;

function runPython<T>(code: string): T {
  const output = execFileSync("python3", ["-B", "-c", PRELUDE + code, scriptPath], {
    encoding: "utf8",
    timeout: 60_000,
    // A proxy in the environment must not stand between the test and its local server.
    env: { ...process.env, NO_PROXY: "*", no_proxy: "*" },
  });
  return JSON.parse(output) as T;
}

describe("scripts/competitor-benchmark.py", () => {
  it("applies robots.txt like RFC 9309: longest rule wins, Allow wins a tie, our group beats *", () => {
    const out = runPython<Record<string, unknown>>(String.raw`
rules = bench.Robots("""
User-agent: *
Disallow: /private
Allow: /private/open
Disallow: /*.pdf$ # keeps the documents out
Disallow: /tie
Allow: /tie
Disallow:
Crawl-delay: 10
""")
ours = bench.Robots("""
User-agent: *
Disallow: /

User-agent: googlebot
User-agent: EsdevenimentsBenchmark
Disallow: /only-us/
Crawl-delay: 3
""")
merged = bench.Robots("User-agent: esdevenimentsbenchmark\nDisallow: /a\nUser-agent: esdevenimentsbenchmark\nDisallow: /b\n")
encoded = bench.Robots("""
User-agent: *
Disallow: /private
Disallow: /%61bc
Disallow: /caf\u00e9
Disallow: /a%2Fb
""")
print(json.dumps({
    "rules": {p: rules.allowed(p) for p in ["/private/secret", "/private", "/private/open/x", "/x/file.pdf", "/x/file.pdf?v=1", "/x/file.pdfx", "/tie", "/free"]},
    "rules_delay": rules.crawl_delay,
    "ours": {p: ours.allowed(p) for p in ["/", "/only-us/x", "/e/1"]},
    "ours_delay": ours.crawl_delay,
    "merged": {p: merged.allowed(p) for p in ["/a", "/b", "/c"]},
    "encoded": {p: encoded.allowed(p) for p in ["/%70rivate/x", "/abc", "/caf%C3%A9", "/caf%c3%a9", "/caf\u00e9", "/a%2fb", "/a/b", "/%2570rivate"]},
    "everything_blocked": bench.Robots("User-agent: *\nDisallow: /").allowed("/"),
    "empty": [bench.Robots("").allowed("/x"), bench.Robots("").crawl_delay],
}))
`);

    expect(out).toEqual({
      rules: {
        "/private/secret": false,
        "/private": false,
        "/private/open/x": true,
        "/x/file.pdf": false,
        "/x/file.pdf?v=1": true,
        "/x/file.pdfx": true,
        "/tie": true,
        "/free": true,
      },
      rules_delay: 10,
      ours: { "/": true, "/only-us/x": false, "/e/1": true },
      ours_delay: 3,
      merged: { "/a": false, "/b": false, "/c": true },
      // an escaped unreserved character and an unescaped one compare alike, in any hex case;
      // an escaped reserved one ("/" or "%") stays what it is
      encoded: {
        "/%70rivate/x": false,
        "/abc": false,
        "/caf%C3%A9": false,
        "/caf%c3%a9": false,
        "/café": false,
        "/a%2fb": false,
        "/a/b": true,
        "/%2570rivate": true,
      },
      everything_blocked: false,
      empty: [true, null],
    });
  });

  it("reads canonical, hreflang and JSON-LD (graphs, mainEntity, breadcrumb, location.geo) and counts visible words only", () => {
    const out = runPython<Record<string, unknown>>(String.raw`
html = """<!doctype html><html><head>
<title> Concert &amp; més </title>
<meta name="description" content=" Una descripció ">
<link rel="canonical" href=" /e/concert "><link rel="canonical" href="/ignored">
<link rel="alternate" hreflang="ca" href="/ca"><link rel="alternate" hreflang="es" href="/es"><link rel="alternate" hreflang="ES" href="/es2">
<script type="application/ld+json">{ not json </script>
<script type="application/ld+json">{"@graph":[{"@type":"WebSite"},{"@type":["Thing","https://schema.org/MusicEvent"],"startDate":"2026-11-20","location":[{"@type":"Place","geo":{"latitude":1}}],"offers":{"price":0},"image":"","description":"  "}]}</script>
<script type="application/ld+json">{"@type":"WebPage","breadcrumb":{"@type":"BreadcrumbList"}}</script>
<style>.x{color:red}</style></head>
<body><svg><title>icon</title></svg><h1>Hello world</h1><noscript>no script words here</noscript><p>three more words</p>
<script>var ignored = "words words";</script></body></html>"""
wrapped = '<script type="application/ld+json">{"@type":"WebPage","mainEntity":{"@type":"Event","startDate":"2026-11-20"}}</script>'
print(json.dumps({
    "page": bench.analyze_page(html),
    "wrapped": bench.analyze_page(wrapped)["event"],
    "no_event": bench.analyze_page("<p>nothing</p>")["event"],
    "no_canonical": [bench.analyze_page('<link rel="canonical">')["canonical"], bench.analyze_page("<p>x</p>")["canonical"]],
    "too_deep": bench.analyze_page('<script type="application/ld+json">' + "[" * 100000 + "</script>")["event"],
}))
`);

    expect(out).toEqual({
      page: {
        title: "Concert & més",
        description: "Una descripció",
        canonical: "/e/concert",
        hreflang: 2,
        types: ["WebSite", "Thing", "MusicEvent", "WebPage", "BreadcrumbList"],
        event: {
          startDate: true,
          endDate: false,
          location: true,
          geo: true,
          image: false,
          offers: true,
          description: false,
        },
        words: 5,
      },
      wrapped: {
        startDate: true,
        endDate: false,
        location: false,
        geo: false,
        image: false,
        offers: false,
        description: false,
      },
      no_event: null,
      no_canonical: [null, null],
      too_deep: null,
    });
  });

  it("tells whether a canonical link points at the page itself", () => {
    const out = runPython<{ same: string[]; none: boolean }>(String.raw`
url = "https://a.test/e/cançó"
cases = ["https://a.test/e/cançó", "https://a.test/e/can%C3%A7%C3%B3", "https://a.test/e/cançó/", "/e/cançó", "https://A.TEST/e/cançó",
         "https://a.test/e/altra", "https://www.a.test/e/cançó", "http://a.test/e/cançó", "https://a.test/e/cançó?x=1", "", "http://["]
print(json.dumps({"same": [c for c in cases if bench._same_page(c, url)], "none": bench._same_page(None, url)}))
`);

    expect(out.same).toEqual([
      "https://a.test/e/cançó",
      "https://a.test/e/can%C3%A7%C3%B3",
      "https://a.test/e/cançó/",
      "/e/cançó",
      "https://A.TEST/e/cançó",
    ]);
    expect(out.none).toBe(false);
  });

  it("parses sitemaps safely, decodes gzip within a cap and keeps the page sample stable", () => {
    const out = runPython<Record<string, unknown>>(String.raw`
def rejected(data):
    try:
        bench.parse_sitemap(data)
    except ValueError:
        return True
    return False

ns = "http://www.sitemaps.org/schemas/sitemap/0.9"
raw = gzip.compress(b"x" * 1000)
try:
    bench._decode(b"\x1f\x8b" + b"garbage", "", 100)
    broken = False
except bench.FetchError:
    broken = True
candidates = [("https://a.test/e/%d" % i, "2026-11-10" if i % 2 else "2025-01-01") for i in range(40)]
few_recent = [("https://a.test/e/%d" % i, "2026-11-10" if i < 2 else "2025-01-01") for i in range(40)]
sample = bench.pick_sample(candidates, 5, TODAY)
print(json.dumps({
    "index": bench.parse_sitemap(('<sitemapindex xmlns="%s"><sitemap><loc> https://a.test/1.xml </loc><lastmod>2026-11-01T10:00Z</lastmod></sitemap></sitemapindex>' % ns).encode()),
    "urlset": bench.parse_sitemap(b"<urlset><url><loc>https://a.test/e/1</loc><image:image xmlns:image='i'><image:loc>x</image:loc></image:image></url><url></url></urlset>"),
    "entity": rejected(b'<!DOCTYPE x [<!ENTITY a "aaaa">]><urlset><url><loc>&a;</loc></url></urlset>'),
    "html": rejected(b"<html></html>"),
    "broken_xml": rejected(b"<urlset><url>"),
    "day": [bench._day("2026-11-01T10:00Z"), bench._day("2014-08-25"), bench._day("soon"), bench._day(None)],
    "url": bench._ascii_url("https://a.test/e/cançó a%20b?x=é"),
    "gzip_cap": [len(bench._decode(raw, "gzip", 100)[0]), bench._decode(raw, "gzip", 100)[1]],
    "gzip_magic": [len(bench._decode(raw, "", 5000)[0]), bench._decode(raw, "", 5000)[1]],
    "plain": bench._decode(b"plain", "", 100)[0].decode(),
    "broken_gzip": broken,
    "same_sample_any_order": sample == bench.pick_sample(list(reversed(candidates)), 5, TODAY),
    "recent_only": all(int(url.rsplit("/", 1)[1]) % 2 for url in sample),
    "falls_back_to_all": len(bench.pick_sample(few_recent, 5, TODAY)),
}))
`);

    expect(out).toEqual({
      index: ["index", [["https://a.test/1.xml", "2026-11-01T10:00Z"]]],
      urlset: ["urlset", [["https://a.test/e/1", null]]],
      entity: true,
      html: true,
      broken_xml: true,
      day: ["2026-11-01", "2014-08-25", null, null],
      url: "https://a.test/e/can%C3%A7%C3%B3%20a%20b?x=%C3%A9",
      gzip_cap: [100, true],
      gzip_magic: [1000, false],
      plain: "plain",
      broken_gzip: true,
      same_sample_any_order: true,
      recent_only: true,
      falls_back_to_all: 5,
    });
  });

  it("measures a healthy site: counts event pages once, reads a sample, and stays polite", () => {
    const out = runPython<{
      result: Record<string, unknown>;
      paths: string[];
      hosts: string[];
      agents: string[];
      agent: string;
      delays: number[];
    }>(String.raw`
base, routes, log = serve()
full = {"@type": "MusicEvent", "startDate": "2026-11-20", "endDate": "2026-11-20", "location": {"@type": "Place", "geo": {"latitude": 1}}, "image": "a.jpg", "offers": {"price": 0}, "description": "d"}
graph = {"@graph": [{"@type": "WebPage"}, {"@type": "Event", "startDate": "2026-11-21", "location": {"@type": "Place"}, "image": "b.jpg", "description": "d"}]}
wrapped = {"@type": "WebPage", "breadcrumb": {"@type": "BreadcrumbList"}, "mainEntity": {"@type": "Event", "startDate": "2026-11-22", "endDate": "2026-11-22", "location": {"geo": {"latitude": 2}}, "offers": {"price": 5}, "description": "d"}}

def alternates(*langs):
    return "".join('<link rel="alternate" hreflang="%s" href="/%s/x">' % (lang, lang) for lang in langs)

routes["/robots.txt"] = ok("User-agent: *\nDisallow: /\n\nUser-agent: EsdevenimentsBenchmark\nDisallow: /e/secret\nCrawl-delay: 0.02\n", "text/plain")
routes["/"] = ok(page("Inici", "<p>one two</p>", [{"@type": "WebSite"}], "x" * 40,
                      '<link rel="alternate" hreflang="ca" href="/"><link rel="alternate" hreflang="es" href="/es">'))
# the index is a .gz served without Content-Encoding; the events file declares it
routes["/sitemap.xml"] = (200, {"Content-Type": "application/x-gzip"}, gzip.compress(
    index([base + "/sitemap-events.xml", base + "/sitemap-pages.xml"]).encode()))
routes["/sitemap-events.xml"] = (200, {"Content-Type": "application/xml", "Content-Encoding": "gzip"}, gzip.compress(urlset([
    (base + "/e/concert-1", "2026-11-15"),
    (base + "/e/concert-2", "2026-10-08"),
    (base + "/e/cançó", "2026-08-09"),
    (base + "/es/e/concert-1", None),  # a translation of an event: a page, not another event
    (base + "/e/secret-1", "2026-11-16"),  # robots.txt says no
    (base + "/e/redirect-1", None),  # same host: followed
    (base + "/e/away-1", None),  # another host: not followed
]).encode()))
routes["/sitemap-pages.xml"] = ok(urlset([(base + "/about", None), (base + "/contact", "2026-11-12")]), "application/xml")
routes["/e/concert-1"] = ok(page("Concert 1", "<p>one two three</p>", [full], "x" * 30,
                                 '<link rel="canonical" href="%s/e/concert-1">' % base + alternates("ca", "es")))
routes["/e/concert-2"] = ok(page("Concert 2", "<p>one two three four five</p>", [graph], "x" * 20,
                                 '<link rel="canonical" href="/e/concert-1">' + alternates("ca", "en")))  # points at another page
routes["/e/can%C3%A7%C3%B3"] = ok(page("Cançó", "<p>un dos tres quatre</p>"))
routes["/e/redirect-1"] = (301, {"Location": "/e/landing"}, b"")
# reached through the redirect, so its own address is /e/landing
routes["/e/landing"] = ok(page("Landing", "<p>one two three four five six seven eight</p>", [wrapped], "x" * 10,
                               '<link rel="canonical" href="%s/e/landing">' % base + alternates("ca", "es", "en")))
routes["/e/away-1"] = (301, {"Location": other_host(base) + "/e/away"}, b"")

site = site_at(base, event_url=r"^/e/")
result = bench.collect_site(site, TODAY, delay=0)
paths = [entry["path"] for entry in log]
hosts = sorted({entry["host"].rsplit(":", 1)[0] for entry in log})
agents = sorted({entry["agent"] for entry in log})

delays = []
client = bench.Client({"127.0.0.1"}, 0)
bench.load_robots(client, site)
delays.append(client.delay)
routes["/robots.txt"] = ok("User-agent: *\nCrawl-delay: 999\n", "text/plain")
client = bench.Client({"127.0.0.1"}, 0)
bench.load_robots(client, site)
delays.append(client.delay)
print(json.dumps({"result": result, "paths": paths, "hosts": hosts, "agents": agents, "agent": bench.USER_AGENT, "delays": delays}))
`);

    const { result } = out;
    expect(result).toMatchObject({
      id: "local",
      ours: false,
      status: "ok",
      notes: [],
      requests: 13, // the redirect's second hop (/e/landing) counts too
      home: {
        kb: 0,
        title_length: 5,
        description_length: 40,
        hreflang: 2,
        json_ld_types: ["WebSite"],
        words: 2,
      },
      catalogue: {
        urls: 9,
        event_urls: 6,
        sitemaps: 3,
        fetched: 3,
        complete: true,
        with_lastmod: 0.5556,
        fresh_30: 0.6,
      },
      event_pages: {
        sampled: 6,
        ok: 4,
        event_json_ld: 0.75,
        props: {
          startDate: 0.75,
          endDate: 0.5,
          location: 0.75,
          geo: 0.5,
          image: 0.5,
          offers: 0.5,
          description: 0.75,
        },
        avg_words: 5,
        ttfb_ms: expect.any(Number),
        description_share: 0.75,
        description_length: 20,
        canonical_share: 0.5,
        breadcrumb_share: 0.25,
        hreflang_share: 0.75,
      },
      crux: null,
    });
    expect(out.paths.filter((path) => path === "/robots.txt")).toHaveLength(1);
    expect(out.paths).toContain("/e/can%C3%A7%C3%B3");
    expect(out.paths).not.toContain("/e/secret-1");
    expect(out.hosts).toEqual(["127.0.0.1"]);
    expect(out.agents).toEqual([out.agent]);
    expect(out.delays).toEqual([0.02, 30]);
  }, 30_000);

  it("follows a redirect one request at a time, so each hop gets robots.txt, spacing, a count and the host check", () => {
    const out = runPython<{
      outcomes: Record<string, unknown[]>;
      paths: string[];
      hosts: string[];
      requests: number;
      min_gap: number;
    }>(String.raw`
base, routes, log = serve()
routes["/robots.txt"] = ok("User-agent: *\nDisallow: /private/\nCrawl-delay: 0.1\n", "text/plain")
routes["/old"] = (301, {"Location": "/new"}, b"")
routes["/new"] = ok(page("New"))
routes["/to-private"] = (302, {"Location": "/private/x"}, b"")
routes["/private/x"] = ok(page("Private"))
routes["/ping"] = (307, {"Location": "/pong"}, b"")
routes["/pong"] = (307, {"Location": "/ping"}, b"")
routes["/away"] = (308, {"Location": other_host(base) + "/new"}, b"")
# raw UTF-8 bytes in Location, which http.client reads as Latin-1
routes["/accent"] = (301, {"Location": "/ça".encode().decode("latin-1")}, b"")
routes["/%C3%A7a"] = ok(page("Ça"))

client = bench.Client({"127.0.0.1"}, 0)
robots = bench.load_robots(client, site_at(base))

def outcome(path):
    try:
        response = bench.fetch(client, robots, base + path, 100_000)
        return ["ok", response.status, response.url.replace(base, "")]
    except bench.FetchError as error:
        return ["error", str(error).replace(base, "").replace(other_host(base), "OTHER")]

outcomes = {path: outcome(path) for path in ["/old", "/to-private", "/ping", "/away", "/accent"]}
gaps = [b["at"] - a["at"] for a, b in zip(log, log[1:])]
print(json.dumps({
    "outcomes": outcomes,
    "paths": [e["path"] for e in log],
    "hosts": sorted({e["host"].rsplit(":", 1)[0] for e in log}),
    "requests": client.requests,
    "min_gap": min(gaps),
}))
`);

    expect(out.outcomes).toEqual({
      "/old": ["ok", 200, "/new"],
      "/to-private": ["error", "robots.txt disallows /private/x"],
      "/ping": ["error", "more than 5 redirects"],
      "/away": ["error", "not one of the site's own URLs: OTHER/new"],
      "/accent": ["ok", 200, "/%C3%A7a"],
    });
    expect(out.paths).toEqual([
      "/robots.txt",
      "/old",
      "/new",
      "/to-private",
      "/ping",
      "/pong",
      "/ping",
      "/pong",
      "/ping",
      "/pong",
      "/away",
      "/accent",
      "/%C3%A7a",
    ]);
    expect(out.hosts).toEqual(["127.0.0.1"]);
    // every request the site saw is counted, redirect hops included
    expect(out.requests).toBe(out.paths.length);
    // and each one waited for the Crawl-delay (0.1 s) since the one before
    expect(out.min_gap).toBeGreaterThanOrEqual(0.09);
  }, 30_000);

  it("leaves a site that refuses us alone and keeps what it already read", () => {
    const out = runPython<{
      robots: { status: string; requests: number; paths: string[]; notes: string[] };
      sitemap: { status: string; requests: number; paths: string[]; notes: string[]; home: unknown; catalogue: unknown };
      unreadable: { status: string; requests: number; paths: string[]; notes: string[] };
    }>(String.raw`
def refused(prepare):
    base, routes, log = serve()
    prepare(base, routes)
    result = bench.collect_site(site_at(base, event_url=r"^/e/"), TODAY, delay=0)
    return {"status": result["status"], "requests": result["requests"], "paths": [e["path"] for e in log],
            "notes": [n.replace(base, "") for n in result["notes"]], "home": result["home"], "catalogue": result["catalogue"]}

def robots_refused(base, routes):
    routes["/robots.txt"] = (403, {}, b"")
    routes["/"] = ok(page("Home"))

def sitemap_refused(base, routes):
    routes["/robots.txt"] = OPEN
    routes["/"] = ok(page("Home", "<p>hi</p>"))
    routes["/sitemap.xml"] = (429, {"Retry-After": "3600"}, b"")

def robots_refused_unreadable(base, routes):
    routes["/robots.txt"] = (403, {"Content-Encoding": "gzip"}, b"not gzip")

first, second = refused(robots_refused), refused(sitemap_refused)
second["home"] = bool(second["home"])
print(json.dumps({"robots": first, "sitemap": second, "unreadable": refused(robots_refused_unreadable)}))
`);

    expect(out.robots).toMatchObject({
      status: "blocked",
      requests: 1,
      paths: ["/robots.txt"],
      notes: ["/robots.txt answered 403"],
    });
    expect(out.sitemap).toMatchObject({
      status: "partial",
      requests: 5,
      paths: ["/robots.txt", "/", "/", "/", "/sitemap.xml"],
      notes: ["/sitemap.xml answered 429"],
      home: true,
      catalogue: null,
    });
    // a refusal is recorded from its status line: its body is never read, so a body that
    // cannot be read does not turn the refusal into a failure that gets retried
    expect(out.unreadable).toMatchObject({
      status: "blocked",
      requests: 1,
      paths: ["/robots.txt"],
      notes: ["/robots.txt answered 403"],
    });
  }, 30_000);

  it("counts a page listed in two sitemap files once and never samples it twice", () => {
    const out = runPython<{ catalogue: Record<string, unknown>; event_paths: string[] }>(String.raw`
base, routes, log = serve()
routes["/robots.txt"] = OPEN
routes["/"] = ok(page("Home", "<p>hi</p>"))
events = [(base + "/e/%d" % i, "2026-11-10") for i in range(1, 4)]
routes["/sitemap.xml"] = ok(index([base + "/a.xml", base + "/b.xml"]), "application/xml")
routes["/a.xml"] = ok(urlset(events + [(base + "/about", None)]), "application/xml")
routes["/b.xml"] = ok(urlset(events[:2] + [(base + "/e/4", "2026-11-11")]), "application/xml")
for i in range(1, 5):
    routes["/e/%d" % i] = ok(page("Event %d" % i, "<p>x</p>"))
result = bench.collect_site(site_at(base, event_url=r"^/e/"), TODAY, delay=0)
print(json.dumps({"catalogue": result["catalogue"], "event_paths": sorted(e["path"] for e in log if e["path"].startswith("/e/"))}))
`);

    // /e/1 and /e/2 are in both files: 5 pages and 4 event pages, each read once
    expect(out.catalogue).toMatchObject({ urls: 5, event_urls: 4 });
    expect(out.event_paths).toEqual(["/e/1", "/e/2", "/e/3", "/e/4"]);
  }, 30_000);

  it("reports an incomplete catalogue or an unmatched pattern instead of a wrong number", () => {
    const out = runPython<Record<string, Record<string, unknown>>>(String.raw`
def crawl(prepare, **kwargs):
    base, routes, log = serve()
    routes["/robots.txt"] = OPEN
    routes["/"] = ok(page("Home", "<p>hi</p>"))
    prepare(base, routes)
    result = bench.collect_site(site_at(base, **kwargs), TODAY, delay=0)
    return {
        "status": result["status"],
        "notes": [note.replace(base, "") for note in result["notes"]],
        "catalogue": result["catalogue"],
        "pages": result["event_pages"] and result["event_pages"]["ok"],
        "paths": [e["path"] for e in log],
        "hosts": sorted({e["host"].rsplit(":", 1)[0] for e in log}),
    }

def events(base, routes):
    routes["/sitemap-a.xml"] = ok(urlset([(base + "/e/1", None), (base + "/e/2", None)]), "application/xml")
    routes["/e/1"] = routes["/e/2"] = ok(page("Event", "<p>hi</p>"))

def one_file_fails(base, routes):
    events(base, routes)
    routes["/sitemap.xml"] = ok(index([base + "/sitemap-a.xml", base + "/sitemap-b.xml"]), "application/xml")
    routes["/sitemap-b.xml"] = (500, {}, b"")

def other_host_file(base, routes):
    events(base, routes)
    routes["/sitemap.xml"] = ok(index([base + "/sitemap-a.xml", other_host(base) + "/sitemap-c.xml"]), "application/xml")

def five_files_fail(base, routes):
    events(base, routes)
    missing = [base + "/missing-%d.xml" % n for n in range(5)]
    routes["/sitemap.xml"] = ok(index([base + "/sitemap-a.xml"] + missing), "application/xml")

def nothing_matches(base, routes):
    events(base, routes)
    routes["/sitemap.xml"] = ok(index([base + "/sitemap-a.xml"]), "application/xml")

def pages_gone(base, routes):
    routes["/sitemap.xml"] = ok(urlset([(base + "/e/%d" % n, None) for n in (1, 2, 3)]), "application/xml")

def pages_disallowed(base, routes):
    pages_gone(base, routes)
    routes["/robots.txt"] = ok("User-agent: *\nDisallow: /e/\n", "text/plain")

print(json.dumps({
    "one_file_fails": crawl(one_file_fails, event_url=r"^/e/"),
    "other_host_file": crawl(other_host_file, event_url=r"^/e/"),
    "five_files_fail": crawl(five_files_fail, event_url=r"^/e/"),
    "nothing_matches": crawl(nothing_matches, event_url=r"^/nothing/"),
    "pages_gone": crawl(pages_gone, event_url=r"^/e/"),
    "pages_disallowed": crawl(pages_disallowed, event_url=r"^/e/"),
}))
`);

    const failing = out.one_file_fails;
    expect(failing.status).toBe("partial");
    expect(failing.catalogue).toMatchObject({
      urls: 2,
      event_urls: 2,
      sitemaps: 3,
      fetched: 2,
      complete: false,
    });
    expect(failing.pages).toBe(2);
    expect(failing.notes).toEqual(["sitemap /sitemap-b.xml: answered 500"]);
    // one retry for a 5xx, and no more
    expect((failing.paths as string[]).filter((path) => path === "/sitemap-b.xml")).toHaveLength(2);

    const foreign = out.other_host_file;
    expect(foreign.status).toBe("partial");
    expect(foreign.catalogue).toMatchObject({ sitemaps: 3, fetched: 2, complete: false });
    expect(foreign.notes).toEqual(["sitemaps left out (another host, or past the 200-file cap): 1"]);
    expect(foreign.hosts).toEqual(["127.0.0.1"]);

    // the first few unreadable files are named; the rest are counted
    const many = out.five_files_fail;
    expect(many.status).toBe("partial");
    expect(many.catalogue).toMatchObject({ sitemaps: 7, fetched: 2, complete: false });
    expect(many.notes).toEqual([
      "sitemap /missing-0.xml: answered 404",
      "sitemap /missing-1.xml: answered 404",
      "sitemap /missing-2.xml: answered 404",
      "sitemaps unreadable: 2 more",
    ]);

    const unmatched = out.nothing_matches;
    expect(unmatched.status).toBe("partial");
    expect(unmatched.catalogue).toMatchObject({ urls: 2, event_urls: 0, complete: true });
    expect(unmatched.notes).toEqual(["no event URLs matched this site's patterns"]);
    expect(unmatched.pages).toBeNull();

    // a sample none of whose pages could be read says why, with one page as an example
    const gone = out.pages_gone;
    expect(gone.status).toBe("partial");
    expect(gone.pages).toBeNull();
    expect(gone.notes).toEqual([expect.stringMatching(/^event pages: none of the 3 sampled pages could be read \(e\.g\. \/e\/[123]: answered 404\)$/)]);

    const disallowed = out.pages_disallowed;
    expect(disallowed.status).toBe("partial");
    expect(disallowed.pages).toBeNull();
    expect(disallowed.notes).toEqual([
      expect.stringMatching(/^event pages: none of the 3 sampled pages could be read \(e\.g\. \/e\/[123]: robots\.txt disallows \/e\/[123]\)$/),
    ]);
    expect(disallowed.paths).toEqual(["/robots.txt", "/", "/", "/", "/sitemap.xml"]);
  }, 30_000);

  it("adds Chrome UX Report speed when a key is set, without leaking it or touching the site's status", () => {
    const out = runPython<{
      parsed: Record<string, number | null>;
      request: Record<string, unknown>;
      tooLittleTraffic: unknown;
      denied: Record<string, unknown>;
      unreachable: Record<string, unknown>;
      blocked: Record<string, unknown>;
      withoutKey: Record<string, unknown>;
      asksWithoutKey: number;
      leaked: boolean;
    }>(String.raw`
import io, urllib.error

record = {"record": {"key": {"origin": "https://a.test", "formFactor": "PHONE"}, "metrics": {
    "largest_contentful_paint": {"percentiles": {"p75": 2345}},
    "cumulative_layout_shift": {"percentiles": {"p75": "0.05"}},  # CLS comes as a string, and INP is missing
}}}
calls = []

def google_answers(answer):
    def urlopen(request, timeout):
        calls.append({"url": request.full_url, "method": request.get_method(), "body": json.loads(request.data),
                      "type": request.get_header("Content-type"), "timeout": timeout})
        if isinstance(answer, Exception):
            raise answer
        return io.BytesIO(json.dumps(answer).encode())
    bench.urllib.request.urlopen = urlopen

def http_error(code):
    return urllib.error.HTTPError("https://x.test/?key=SECRET", code, "no", {}, io.BytesIO())

def crawl(prepare, key="SECRET"):
    base, routes, log = serve()
    prepare(base, routes)
    result = bench.collect_site(site_at(base, event_url=r"^/e/"), TODAY, delay=0, crux_key=key)
    return {"status": result["status"], "notes": result["notes"], "crux": result["crux"],
            "pages": result["event_pages"] and result["event_pages"]["ok"]}

def healthy(base, routes):
    routes["/robots.txt"] = OPEN
    routes["/"] = ok(page("Home", "<p>hi</p>"))
    routes["/sitemap.xml"] = ok(urlset([(base + "/e/1", None)]), "application/xml")
    routes["/e/1"] = ok(page("Event", "<p>hi</p>"))

def refused(base, routes):
    routes["/robots.txt"] = (403, {}, b"")

site = bench.Site("local", "Local", "https://a.test/", "https://a.test/sitemap.xml")
google_answers(record)
parsed = bench.measure_crux(site, "SECRET")
request = calls[0]
google_answers(http_error(404))
too_little_traffic = bench.measure_crux(site, "SECRET")

google_answers(http_error(403))
denied = crawl(healthy)
google_answers(OSError("cannot reach https://x.test/?key=SECRET"))
unreachable = crawl(healthy)
google_answers(record)
blocked = crawl(refused)
calls.clear()
without_key = crawl(healthy, key=None)
print(json.dumps({"parsed": parsed, "request": request, "tooLittleTraffic": too_little_traffic, "denied": denied,
                  "unreachable": unreachable, "blocked": blocked, "withoutKey": without_key,
                  "asksWithoutKey": len(calls), "leaked": "SECRET" in json.dumps([denied, unreachable])}))
`);

    expect(out.parsed).toEqual({ lcp: 2345, inp: null, cls: 0.05 });
    expect(out.request).toEqual({
      url: "https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=SECRET",
      method: "POST",
      body: {
        origin: "https://a.test",
        formFactor: "PHONE",
        metrics: ["largest_contentful_paint", "interaction_to_next_paint", "cumulative_layout_shift"],
      },
      type: "application/json",
      timeout: 20,
    });
    expect(out.tooLittleTraffic).toBeNull();
    expect(out.denied).toEqual({
      status: "ok",
      notes: ["crux: Chrome UX Report answered 403"],
      crux: null,
      pages: 1,
    });
    expect(out.unreachable).toMatchObject({ status: "ok", notes: ["crux: Chrome UX Report failed: OSError"], crux: null });
    // Google's data doesn't depend on the site letting us in, and doesn't change its status
    expect(out.blocked).toMatchObject({ status: "blocked", crux: { lcp: 2345, inp: null, cls: 0.05 } });
    expect(out.withoutKey).toEqual({ status: "ok", notes: [], crux: null, pages: 1 });
    expect(out.asksWithoutKey).toBe(0);
    expect(out.leaked).toBe(false);
  }, 30_000);

  it("reports a site lost to an unexpected error with the same fields as any other", () => {
    const out = runPython<{ sameFields: boolean; status: string; notes: string[] }>(String.raw`
base, routes, log = serve()
routes["/robots.txt"] = OPEN
routes["/"] = ok(page("Home", "<p>hi</p>"))
routes["/sitemap.xml"] = ok(urlset([(base + "/e/1", None)]), "application/xml")
routes["/e/1"] = ok(page("Event", "<p>hi</p>"))
site = site_at(base, event_url=r"^/e/")
normal = bench.collect_site(site, TODAY, delay=0)

def broken(*args, **kwargs):
    raise RuntimeError("bug")

bench.collect_site = broken
lost = bench.run([site], TODAY, delay=0)["sites"][0]
print(json.dumps({"sameFields": sorted(lost) == sorted(normal), "status": lost["status"], "notes": lost["notes"]}))
`);

    expect(out).toEqual({ sameFields: true, status: "error", notes: ["unexpected RuntimeError: bug"] });
  }, 30_000);
});
