import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  CLIENT_APP_KEYS,
  CLIENT_COMPONENT_KEYS,
  CLIENT_UTILS_KEYS,
  CLIENT_FULL_TOP_LEVEL,
} from "../lib/i18n/client-namespaces";

// Directories that can contain client-rendered code. The Provider `messages`
// prop only needs entries for namespaces consumed by these files.
const SCAN_ROOTS = ["app", "components", "hooks", "lib", "utils"];

// React hooks that only run in client components. A file importing any of
// these is treated as client-rendered regardless of whether it carries an
// explicit `"use client"` directive (some shared client modules omit it and
// rely on transitive inheritance from a `"use client"` importer).
const CLIENT_HOOK_PATTERN =
  /\buse(State|Effect|Memo|Callback|Reducer|Ref|LayoutEffect|ImperativeHandle|Context|SyncExternalStore|Transition|DeferredValue|Id|InsertionEffect|Optimistic|ActionState|FormStatus|FormState)\b/;

const USE_CLIENT_DIRECTIVE = /^\s*["']use client["']\s*;?/;

// Matches `useTranslations("Foo.Bar")` or `useTranslations('Foo.Bar')`.
// We intentionally do NOT match template literals or dynamic args — any such
// call is flagged as unsafe because we can't statically determine the
// namespace.
const USE_TRANSLATIONS_LITERAL = /useTranslations\s*\(\s*(["'])([^"']+)\1\s*\)/g;

// Matches any useTranslations call, including dynamic ones we want to reject.
// Used to detect cases that escape static analysis.
const USE_TRANSLATIONS_ANY = /useTranslations\s*\(([^)]*)\)/g;

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry === "node_modules" || entry === ".next" || entry.startsWith("."))
      continue;
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".d.ts")) {
      out.push(full);
    }
  }
  return out;
}

function isClientFile(source: string): boolean {
  // Check only the first ~500 chars for the directive — directives must be
  // at the top of the file to take effect.
  if (USE_CLIENT_DIRECTIVE.test(source.slice(0, 500))) return true;
  return CLIENT_HOOK_PATTERN.test(source);
}

// Strip comments and the *contents* of string/template literals that aren't
// the first argument to `useTranslations(`. Without this pass:
// - a comment like `// useTranslations("X")` → false positive
// - a string like `'useTranslations("X") failed'` → false positive
//
// We need to keep the literal arg in `useTranslations("X")` itself because
// that's what we're scanning for. Strategy: a small state machine that
// recognizes the `useTranslations(` token sequence and, only then, preserves
// the subsequent string-literal arg verbatim. Everything else inside strings
// or comments gets replaced with spaces (newlines preserved so line numbers
// stay accurate in error output).
function stripComments(source: string): string {
  const out: string[] = [];
  let i = 0;
  const USE_T = "useTranslations";
  const pushBlank = (count: number) => {
    const chunk = source.slice(i, i + count);
    for (const ch of chunk) out.push(ch === "\n" ? "\n" : " ");
    i += count;
  };
  while (i < source.length) {
    const c = source[i];
    const next = source[i + 1];
    // Line comment
    if (c === "/" && next === "/") {
      const end = source.indexOf("\n", i);
      pushBlank((end === -1 ? source.length : end) - i);
      continue;
    }
    // Block comment
    if (c === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      pushBlank((end === -1 ? source.length : end + 2) - i);
      continue;
    }
    // Is this the start of a genuine `useTranslations(` token? If so, copy
    // the identifier, skip whitespace, then preserve the string arg verbatim.
    if (
      c === "u" &&
      source.slice(i, i + USE_T.length) === USE_T &&
      // Must be a standalone identifier (no leading word char, no trailing
      // word char before `(`).
      (i === 0 || !/[\w$]/.test(source[i - 1]))
    ) {
      let j = i + USE_T.length;
      // Walk past whitespace/newlines between the identifier and `(`.
      let afterIdent = j;
      while (afterIdent < source.length && /\s/.test(source[afterIdent])) {
        afterIdent++;
      }
      if (source[afterIdent] === "(") {
        // Copy everything up to and including `(`, preserving layout.
        for (let k = i; k <= afterIdent; k++) out.push(source[k]);
        i = afterIdent + 1;
        // Now preserve the immediate string-literal arg (if any) verbatim.
        // Skip whitespace first.
        while (i < source.length && /\s/.test(source[i])) {
          out.push(source[i]);
          i++;
        }
        // If next char is a quote, copy the whole literal through the closing
        // quote — that's the namespace arg we want to scan.
        if (i < source.length && (source[i] === "'" || source[i] === '"')) {
          const quote = source[i];
          out.push(quote);
          i++;
          while (i < source.length) {
            const ch = source[i];
            if (ch === "\\") {
              out.push(ch);
              if (i + 1 < source.length) out.push(source[i + 1]);
              i += 2;
              continue;
            }
            out.push(ch);
            i++;
            if (ch === quote) break;
          }
        }
        continue;
      }
      // `useTranslations` followed by something other than `(` (e.g. an
      // import binding `import { useTranslations } from ...`). Just copy it.
      for (let k = i; k < j; k++) out.push(source[k]);
      i = j;
      continue;
    }
    // String or template literal that is NOT a useTranslations arg — blank it.
    if (c === "'" || c === '"' || c === "`") {
      const quote = c;
      out.push(c);
      i++;
      while (i < source.length) {
        const ch = source[i];
        if (ch === "\\") {
          out.push(" ");
          if (i + 1 < source.length) {
            out.push(source[i + 1] === "\n" ? "\n" : " ");
          }
          i += 2;
          continue;
        }
        if (ch === quote) {
          out.push(ch);
          i++;
          break;
        }
        out.push(ch === "\n" ? "\n" : " ");
        i++;
      }
      continue;
    }
    out.push(c);
    i++;
  }
  return out.join("");
}

type Callsite = {
  file: string;
  line: number;
  namespace: string | null; // null = dynamic/unsafe
  rawArg: string;
};

function scanCallsites(): Callsite[] {
  const repoRoot = process.cwd();
  const files = SCAN_ROOTS.flatMap((root) => walk(join(repoRoot, root)));
  const results: Callsite[] = [];

  for (const file of files) {
    const rawSource = readFileSync(file, "utf8");
    if (!rawSource.includes("useTranslations")) continue;
    if (!isClientFile(rawSource)) continue;
    const source = stripComments(rawSource);

    // First pass: detect literal namespace calls.
    const seenRanges = new Set<number>();
    for (const match of source.matchAll(USE_TRANSLATIONS_LITERAL)) {
      const index = match.index ?? 0;
      seenRanges.add(index);
      const line = source.slice(0, index).split("\n").length;
      results.push({
        file,
        line,
        namespace: match[2],
        rawArg: match[0],
      });
    }

    // Second pass: catch any useTranslations(...) call that did NOT match the
    // literal pattern — those are dynamic or use template literals.
    for (const match of source.matchAll(USE_TRANSLATIONS_ANY)) {
      const index = match.index ?? 0;
      if (seenRanges.has(index)) continue;
      // Note: `match[1]` holds the raw arg text (dynamic var, template
      // literal, or empty for no-arg form). We don't inspect it — any of
      // those are flagged as unsafe because we can't determine the namespace.
      const line = source.slice(0, index).split("\n").length;
      results.push({
        file,
        line,
        namespace: null,
        rawArg: match[0],
      });
    }
  }

  return results;
}

function relPath(absolute: string): string {
  return absolute.replace(`${process.cwd()}/`, "");
}

function loadMessages(locale: string): Record<string, Record<string, unknown>> {
  const path = join(process.cwd(), "messages", `${locale}.json`);
  return JSON.parse(readFileSync(path, "utf8"));
}

function locales(): string[] {
  const dir = join(process.cwd(), "messages");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
}

describe("i18n client namespace whitelist", () => {
  const callsites = scanCallsites();

  it("finds useTranslations calls to audit (sanity)", () => {
    // Guard against a regex regression that silently returns zero calls and
    // makes the rest of this suite trivially pass.
    expect(callsites.length).toBeGreaterThan(30);
  });

  it("rejects dynamic or template-literal useTranslations calls", () => {
    const unsafe = callsites.filter((c) => c.namespace === null);
    expect(
      unsafe,
      `Found ${unsafe.length} useTranslations call(s) with non-literal arguments. ` +
        `Static analysis cannot determine which namespaces these consume. ` +
        `Replace them with a literal string namespace.\n` +
        unsafe
          .map((c) => `  ${relPath(c.file)}:${c.line}  ${c.rawArg}`)
          .join("\n"),
    ).toEqual([]);
  });

  it("every client-consumed namespace is covered by the whitelist", () => {
    const appSet: Set<string> = new Set(CLIENT_APP_KEYS);
    const componentsSet: Set<string> = new Set(CLIENT_COMPONENT_KEYS);
    const utilsSet: Set<string> = new Set(CLIENT_UTILS_KEYS);
    const fullTopLevel: Set<string> = new Set(CLIENT_FULL_TOP_LEVEL);

    const missing: string[] = [];

    for (const cs of callsites) {
      if (cs.namespace === null) continue; // already reported
      const [top, sub] = cs.namespace.split(".", 2);

      if (fullTopLevel.has(top)) continue; // whole namespace shipped

      // These top-levels use sub-key whitelists.
      if (top === "App") {
        if (!sub || !appSet.has(sub)) {
          missing.push(
            `  ${relPath(cs.file)}:${cs.line}  namespace="${cs.namespace}" — add "${sub ?? "<root>"}" to CLIENT_APP_KEYS`,
          );
        }
        continue;
      }
      if (top === "Components") {
        if (!sub || !componentsSet.has(sub)) {
          missing.push(
            `  ${relPath(cs.file)}:${cs.line}  namespace="${cs.namespace}" — add "${sub ?? "<root>"}" to CLIENT_COMPONENT_KEYS`,
          );
        }
        continue;
      }
      if (top === "Utils") {
        if (!sub || !utilsSet.has(sub)) {
          missing.push(
            `  ${relPath(cs.file)}:${cs.line}  namespace="${cs.namespace}" — add "${sub ?? "<root>"}" to CLIENT_UTILS_KEYS`,
          );
        }
        continue;
      }

      // Unknown top-level namespace — must be added to CLIENT_FULL_TOP_LEVEL
      // (and verified that it's not huge) or to one of the sub-key lists.
      missing.push(
        `  ${relPath(cs.file)}:${cs.line}  namespace="${cs.namespace}" — top-level "${top}" is not shipped to the client Provider. Add it to CLIENT_FULL_TOP_LEVEL in lib/i18n/client-namespaces.ts or introduce a sub-key whitelist.`,
      );
    }

    expect(
      missing,
      `Client components reference namespaces that are NOT in the Provider ` +
        `whitelist. These would throw MISSING_MESSAGE at render time. Fix by ` +
        `updating lib/i18n/client-namespaces.ts:\n${missing.join("\n")}`,
    ).toEqual([]);
  });

  it("does not whitelist namespaces that no client component references", () => {
    // Dead-entry check. This prevents bloat creep when a client component that
    // used a namespace is later removed or refactored to server-only, but the
    // whitelist isn't cleaned up. Warning-level: non-fatal to avoid flakiness
    // on refactors, but logged.
    const usedApp = new Set<string>();
    const usedComponents = new Set<string>();
    const usedUtils = new Set<string>();

    for (const cs of callsites) {
      if (cs.namespace === null) continue;
      const [top, sub] = cs.namespace.split(".", 2);
      if (!sub) continue;
      if (top === "App") usedApp.add(sub);
      else if (top === "Components") usedComponents.add(sub);
      else if (top === "Utils") usedUtils.add(sub);
    }

    const dead: string[] = [];
    for (const k of CLIENT_APP_KEYS) if (!usedApp.has(k)) dead.push(`App.${k}`);
    for (const k of CLIENT_COMPONENT_KEYS)
      if (!usedComponents.has(k)) dead.push(`Components.${k}`);
    for (const k of CLIENT_UTILS_KEYS)
      if (!usedUtils.has(k)) dead.push(`Utils.${k}`);

    // Soft assertion: surface as a test message but don't fail. If you see
    // this list grow, consider removing unused entries from
    // lib/i18n/client-namespaces.ts to shrink the RSC payload further.
    if (dead.length > 0) {
       
      console.warn(
        `[i18n-whitelist] ${dead.length} whitelisted namespace(s) appear ` +
          `unused by client components. Consider removing:\n  ${dead.join("\n  ")}`,
      );
    }
    // Not expect().toEqual([]) — dead entries are bloat, not correctness bugs.
    expect(dead.length).toBeLessThan(100); // sanity: list hasn't exploded
  });

  it("every whitelisted key exists in every locale's messages file", () => {
    // Catches typos (e.g. "Acdboard") and deletions of a messages key that
    // leave the whitelist pointing at nothing. Without this, the Provider
    // silently ships `{}` for the affected namespace and the
    // useTranslations('...') call throws MISSING_MESSAGE at render time.
    const problems: string[] = [];

    for (const locale of locales()) {
      let messages: Record<string, Record<string, unknown>>;
      try {
        messages = loadMessages(locale);
      } catch (err) {
        problems.push(
          `  ${locale}.json: failed to parse — ${(err as Error).message}`,
        );
        continue;
      }

      const check = (top: string, subKeys: readonly string[]) => {
        const bucket = messages[top];
        if (!bucket || typeof bucket !== "object") {
          problems.push(`  ${locale}.json: missing top-level "${top}"`);
          return;
        }
        for (const sub of subKeys) {
          if (!(sub in bucket)) {
            problems.push(
              `  ${locale}.json: missing key "${top}.${sub}" (whitelisted in lib/i18n/client-namespaces.ts)`,
            );
          }
        }
      };

      check("App", CLIENT_APP_KEYS);
      check("Components", CLIENT_COMPONENT_KEYS);
      check("Utils", CLIENT_UTILS_KEYS);

      for (const top of CLIENT_FULL_TOP_LEVEL) {
        if (!(top in messages)) {
          problems.push(
            `  ${locale}.json: missing top-level "${top}" (listed in CLIENT_FULL_TOP_LEVEL)`,
          );
        }
      }
    }

    expect(
      problems,
      `Whitelisted client namespaces don't all resolve in messages/*.json. ` +
        `Fix by updating lib/i18n/client-namespaces.ts or the messages files:\n` +
        problems.join("\n"),
    ).toEqual([]);
  });
});
