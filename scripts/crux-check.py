"""Real-user Core Web Vitals (Google CrUX, phone, p75) for production.

Usage: CRUX_API_KEY=... python3 scripts/crux-check.py
The key is free (Google Cloud, "Chrome UX Report API"). Without the env var the
script reads ~/.config/crux/api-key. Results: docs/performance/baselines.md
"""
import json, os, urllib.request
key = os.environ.get("CRUX_API_KEY")
if not key:
    with open(os.path.expanduser("~/.config/crux/api-key")) as f:
        key = f.read().strip()
M = [("largest_contentful_paint","LCP"),("interaction_to_next_paint","INP"),("cumulative_layout_shift","CLS"),("first_contentful_paint","FCP"),("experimental_time_to_first_byte","TTFB")]
def q(body, hist=False):
    url = f"https://chromeuxreport.googleapis.com/v1/records:{'queryHistoryRecord' if hist else 'queryRecord'}?key={key}"
    req = urllib.request.Request(url, data=json.dumps({**body, "formFactor": "PHONE"}).encode(), headers={"Content-Type": "application/json"})
    try: return json.load(urllib.request.urlopen(req))["record"]
    except Exception: return None
for name, body in [("origin", {"origin": "https://www.esdeveniments.cat"})] + [(u, {"url": "https://www.esdeveniments.cat" + u}) for u in ["/", "/catalunya", "/barcelona", "/es/catalunya"]]:
    r = q(body)
    if not r: print(f"{name}: no data"); continue
    out = []
    for k, n in M:
        x = r["metrics"].get(k)
        if x: out.append(f"{n} {x['percentiles']['p75']} ({x['histogram'][0].get('density',0)*100:.0f}% good)")
    print(f"{name}: " + " | ".join(out))
r = q({"origin": "https://www.esdeveniments.cat"}, hist=True)
if r:
    periods = r["collectionPeriods"]
    for k, n in [("largest_contentful_paint","LCP"),("cumulative_layout_shift","CLS"),("interaction_to_next_paint","INP")]:
        p = r["metrics"][k]["percentilesTimeseries"]["p75s"]
        idx = [0, len(p)//2, len(p)-1]
        print(n, "p75 history:", ", ".join(f"{periods[i]['lastDate']['year']}-{periods[i]['lastDate']['month']:02d}-{periods[i]['lastDate']['day']:02d}={p[i]}" for i in idx))
