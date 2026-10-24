import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import ca from "../messages/ca.json";
import es from "../messages/es.json";
import en from "../messages/en.json";
import localeLabels from "../i18n/locale-labels.generated.json";

const STALE = "stale: run `yarn i18n:labels`";

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".d.ts")) out.push(full);
  }
  return out;
}

describe("i18n/locale-labels.generated.json", () => {
  it("matches Components.Constants in every locale", () => {
    expect(localeLabels.constants.ca, STALE).toEqual(ca.Components.Constants);
    expect(localeLabels.constants.es, STALE).toEqual(es.Components.Constants);
    expect(localeLabels.constants.en, STALE).toEqual(en.Components.Constants);
  });

  it("matches the Catalan Utils sections it copies", () => {
    for (const [key, value] of Object.entries(localeLabels.utils)) {
      expect(value, `Utils.${key} ${STALE}`).toEqual(
        ca.Utils[key as keyof typeof ca.Utils],
      );
    }
  });

  // A runtime import of messages/*.json from shared code ships the whole file
  // to any client component that reaches it (~80 KB per locale).
  it("is the only messages source for shared code outside i18n/request.ts", () => {
    const offenders = ["app", "components", "config", "lib", "utils"]
      .flatMap((root) => walk(root))
      .filter((file) =>
        /^\s*import\s+(?!type\b)[^;]*["'][./]*messages\/\w+\.json["']/m.test(
          readFileSync(file, "utf8"),
        ),
      );
    expect(offenders).toEqual([]);
  });
});
