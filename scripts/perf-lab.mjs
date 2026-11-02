// Lab metrics for a running site: Pixel 7, 4x CPU, 1.6 Mbps / 150 ms, median of 3 runs.
// Usage: node scripts/perf-lab.mjs <base-url> <label> <out.json> <path>...
// Example: node scripts/perf-lab.mjs http://localhost:3100 develop /tmp/develop.json / /catalunya
// Results and method: docs/performance/baselines.md
import { chromium, devices } from "playwright";
import { writeFileSync } from "node:fs";

const [, , base, label, out, ...paths] = process.argv;
const RUNS = 3;
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

const browser = await chromium.launch();
const result = { label, pages: {} };

for (const path of paths) {
  // Server time for the full HTML: first request (cold) and a repeat (warm).
  const timed = async () => { const t = performance.now(); await fetch(base + path).then((r) => r.arrayBuffer()); return Math.round(performance.now() - t); };
  const serverColdMs = await timed();
  await timed();
  const serverWarmMs = await timed();
  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    const ctx = await browser.newContext({ ...devices["Pixel 7"], serviceWorkers: "block" });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8,
    });
    await page.addInitScript(() => {
      window.__m = { lcp: 0, el: "", cls: 0, tbt: 0 };
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) {
          window.__m.lcp = e.startTime;
          const t = e.element?.tagName || "?";
          window.__m.el = t === "IMG" ? "image" : `text (${t.toLowerCase()})`;
        }
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) if (!e.hadRecentInput) window.__m.cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__m.tbt += Math.max(0, e.duration - 50);
      }).observe({ type: "longtask", buffered: true });
    });
    await page.goto(base + path, { waitUntil: "load", timeout: 120000 });
    await page.waitForTimeout(5000);
    runs.push(await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0];
      const res = performance.getEntriesByType("resource");
      const fcp = performance.getEntriesByName("first-contentful-paint")[0];
      const kb = (xs) => Math.round(xs.reduce((s, x) => s + (x.transferSize || 0), 0) / 1024);
      return {
        ttfb: nav.responseStart, fcp: fcp?.startTime || 0, lcp: window.__m.lcp, el: window.__m.el,
        cls: window.__m.cls, tbt: window.__m.tbt, domInteractive: nav.domInteractive,
        htmlKbWire: Math.round(nav.transferSize / 1024), htmlKbRaw: Math.round(nav.decodedBodySize / 1024),
        jsKb: kb(res.filter((r) => r.initiatorType === "script" || r.name.endsWith(".js"))),
        imgKb: kb(res.filter((r) => r.initiatorType === "img" || /image/.test(r.name))),
        totalKb: kb(res) + Math.round(nav.transferSize / 1024), requests: res.length + 1,
      };
    }));
    await ctx.close();
  }
  const m = {};
  for (const k of Object.keys(runs[0])) m[k] = k === "el" ? runs.map((r) => r.el)[1] : Math.round(median(runs.map((r) => r[k])) * (k === "cls" ? 1000 : 1)) / (k === "cls" ? 1000 : 1);
  m.serverColdMs = serverColdMs;
  m.serverWarmMs = serverWarmMs;
  result.pages[path] = m;
  console.log(label, path, JSON.stringify(m));
}
await browser.close();
writeFileSync(out, JSON.stringify(result, null, 1));
