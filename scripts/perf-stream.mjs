// When do the first chunk, the LCP image tag, the first visible <h1> and the last byte arrive?
// Usage: node scripts/perf-stream.mjs <url> [runs]   ("NC" in the url becomes a random value,
// e.g. https://www.esdeveniments.cat/barcelona?nc=NC skips Cloudflare's cache)
// Results and method: docs/performance/baselines.md ("2026-11-06 (2)").
const [, , url, runsArg] = process.argv;
const RUNS = Number(runsArg) || 5;
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36";
const runs = [];
for (let i = 0; i < RUNS; i++) {
  const t0 = performance.now();
  const res = await fetch(url.replace("NC", Math.random().toString(36).slice(2)), { headers: { "user-agent": UA, "accept-encoding": "br" } });
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let html = "", first = 0, img = 0, h1 = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const now = performance.now() - t0;
    first ||= now;
    html += decoder.decode(value, { stream: true });
    if (!img && /fetchPriority="high"/i.test(html)) img = now;
    if (!h1 && /<h1(?![^>]*sr-only)[^>]*>/.test(html)) h1 = now;
  }
  runs.push({ cf: res.headers.get("cf-cache-status"), first, img, h1, last: performance.now() - t0 });
}
const med = (k) => Math.round(runs.map((r) => r[k]).sort((a, b) => a - b)[Math.floor(runs.length / 2)]);
console.log(url, runs.map((r) => r.cf).join(","), "| first chunk", med("first"), "LCP image", med("img"), "h1", med("h1"), "last", med("last"), "ms");
