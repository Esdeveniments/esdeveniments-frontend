import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

describe("scripts/seo-audit.py action rules", () => {
  it("ignores <2% KPI noise, non-EVENT searchAppearance, and 3-segment lingering impressions as P1", () => {
    const scriptPath = join(process.cwd(), "scripts", "seo-audit.py");
    const output = execFileSync(
      "python3",
      [
        "-B",
        "-c",
        `
import importlib.util, json, sys

spec = importlib.util.spec_from_file_location("seo_audit", sys.argv[1])
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

prev = {
    "gsc": {"kpis": {"clicks": 3270, "impressions": 125452, "ctr": 0.0261, "position": 16.9}},
    "ga4": {"kpis": {"sessions": 5317, "organic_sessions": 3756, "ai_sessions": 592, "bounce_rate": 0.073, "avg_duration": 125.2}},
}
cur = {
    "meta": {"run_date": "2026-11-15", "period": {"start": "2026-08-14", "end": "2026-11-12"}},
    "gsc": {
        "kpis": {"clicks": 3326, "impressions": 125416, "ctr": 0.0265, "position": 16.7},
        "striking_distance": [],
        "cannibalization": [],
        "quick_wins": [],
        "trends": {"rising": [], "declining": []},
        "i18n_cannibalization": [],
        "three_segment_indexed": [{"page": "https://www.esdeveniments.cat/es/maresme/avui/musica", "impressions": 11, "clicks": 1, "position": 6.5}],
        "dead_pages": [],
        "search_appearance": [{"type": "FORUMS", "clicks": 0, "impressions": 12, "ctr": 0.0}],
        "ai_overview_suspects": [],
        "expired_events_indexed": [],
    },
    "ga4": {
        "kpis": {"sessions": 5206, "organic_sessions": 3614, "ai_sessions": 575, "bounce_rate": 0.074, "avg_duration": 125.0},
        "traffic_sources": [],
        "custom_events": {"share": {"count": 60, "users": 40}, "add_to_calendar": {"count": 60, "users": 40}, "ai_referrer": {"count": 57, "users": 50}},
        "high_bounce_pages": [],
        "behavior": {},
    },
    "cwv": {},
}

actions_flat = mod.generate_actions(cur, prev)
md = mod.generate_markdown(cur, prev)

severe = json.loads(json.dumps(cur))
severe["ga4"]["kpis"]["organic_sessions"] = 2800
severe["gsc"]["kpis"]["clicks"] = 3000
actions_drop = mod.generate_actions(severe, prev)

print(json.dumps({
    "flat_p1": [a["title"] for a in actions_flat if a["priority"] == "P1"],
    "flat_info": [a["title"] for a in actions_flat if a["priority"] == "INFO"],
    "has_false_rich_warning": "No Event rich results" in md,
    "drop_priorities": {a["title"]: a["priority"] for a in actions_drop if a["title"].startswith("Declining:")},
}))
`,
        scriptPath,
      ],
      { encoding: "utf8" },
    );

    const parsed = JSON.parse(output) as {
      flat_p1: string[];
      flat_info: string[];
      has_false_rich_warning: boolean;
      drop_priorities: Record<string, string>;
    };

    expect(parsed.flat_p1).toEqual([]);
    expect(parsed.flat_info).toEqual([
      "3-segment URLs in 90d GSC window: 1 pages (11 impressions)",
    ]);
    expect(parsed.has_false_rich_warning).toBe(false);
    expect(parsed.drop_priorities).toEqual({
      "Declining: GA4 Organic Sessions (-25.5%)": "P1",
      "Declining: GA4 Sessions (-2.1%)": "P2",
      "Declining: GA4 AI Sessions (-2.9%)": "P2",
      "Declining: GSC Clicks (-8.3%)": "P2",
    });
  });
});
