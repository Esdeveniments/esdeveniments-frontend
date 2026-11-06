// Which scripts block the main thread on a live page, and when (Long Animation Frames).
// Usage: node scripts/perf-google-tbt.mjs <base-url> <runs> <out.json> <path>...
//   VARS=all,noGtag,noFC,none  pick variants (default: all four)
//   TAP=1                      also measure a tap 1 s after load (INP proxy)
// Pixel 7, 4x CPU, 1.6 Mbps / 150 ms, first visit; ad and analytics hits blocked.
// Results and method: docs/performance/baselines.md ("2026-11-06 (2)").
import { chromium, devices } from "playwright";
import { writeFileSync } from "node:fs";

const [, , base, runsArg, out, ...paths] = process.argv;
const RUNS = Number(runsArg) || 5;
const HITS = /googlesyndication|doubleclick|adtrafficquality|googleadservices|google-analytics\.com|\/g\/collect|\/pagead\//;
const GTAG = /googletagmanager\.com\/gtag\/js/;
const FC = /fundingchoicesmessages\.google\.com/;
const VARIANTS = { all: null, noGtag: GTAG, noFC: FC, none: new RegExp(`${GTAG.source}|${FC.source}`) };
const picked = Object.entries(VARIANTS).filter(([v]) => !process.env.VARS || process.env.VARS.split(",").includes(v));
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

const browser = await chromium.launch();
const results = {};
for (const path of paths) for (const [variant, block] of picked) for (const tap of process.env.TAP ? [false, true] : [false]) {
  const key = `${path} ${variant}${tap ? " tap" : ""}`;
  const runs = (results[key] = []);
  for (let i = 0; i < RUNS; i++) {
    const ctx = await browser.newContext({ ...devices["Pixel 7"], serviceWorkers: "block", locale: "ca-ES" });
    await ctx.route("**/*", (route) => {
      const url = route.request().url();
      return HITS.test(url) || block?.test(url) ? route.abort() : route.continue();
    });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
    await page.addInitScript(() => {
      const m = (window.__m = { lcp: 0, el: "", tbt: 0, frames: [], inp: 0 });
      const observe = (type, fn, opts = {}) => new PerformanceObserver((l) => l.getEntries().forEach(fn)).observe({ type, buffered: true, ...opts });
      observe("largest-contentful-paint", (e) => {
        m.lcp = e.startTime;
        const n = e.element;
        m.el = !n ? "?" : n.tagName === "IMG" ? "image" : n.closest(".fc-consent-root") ? "consent box" : `text (${n.tagName.toLowerCase()})`;
      });
      observe("longtask", (e) => { m.tbt += Math.max(0, e.duration - 50); });
      observe("long-animation-frame", (e) => m.frames.push({ start: e.startTime, block: e.blockingDuration, scripts: e.scripts.map((s) => ({ src: s.sourceURL || s.invoker, dur: s.duration })) }));
      observe("event", (e) => { if (e.interactionId) m.inp = Math.max(m.inp, e.duration); }, { durationThreshold: 16 });
    });
    await page.goto(base + path, { waitUntil: "load", timeout: 120000 });
    if (tap) { await page.waitForTimeout(1000); await page.mouse.click(5, 300); }
    await page.waitForTimeout(tap ? 4000 : 5000);
    runs.push(await page.evaluate(() => {
      const m = window.__m;
      const byHost = {};
      for (const f of m.frames) {
        const total = f.scripts.reduce((s, x) => s + x.dur, 0) || 1;
        for (const s of f.scripts) {
          let host = s.src || "?";
          try { host = new URL(s.src).host; } catch {}
          byHost[host] = Math.round((byHost[host] || 0) + f.block * (s.dur / total));
        }
      }
      const gtagFrames = m.frames.filter((f) => f.scripts.some((s) => /googletagmanager/.test(s.src))).map((f) => [Math.round(f.start), Math.round(f.block)]);
      return { load: Math.round(performance.getEntriesByType("navigation")[0].loadEventEnd), lcp: Math.round(m.lcp), el: m.el, tbt: Math.round(m.tbt), inp: Math.round(m.inp), byHost, gtagFrames };
    }));
    await ctx.close();
  }
  const mid = runs.find((r) => r.tbt === median(runs.map((x) => x.tbt)));
  console.log(key, "| load", median(runs.map((r) => r.load)), "LCP", median(runs.map((r) => r.lcp)), [...new Set(runs.map((r) => r.el))].join("/"), "TBT", median(runs.map((r) => r.tbt)),
    tap ? `tap ${median(runs.map((r) => r.inp))}` : "", "| by script", JSON.stringify(mid.byHost), "| gtag frames", JSON.stringify(mid.gtagFrames));
}
writeFileSync(out, JSON.stringify(results, null, 1));
await browser.close();
