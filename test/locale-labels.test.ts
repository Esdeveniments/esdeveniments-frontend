import { describe, expect, it } from "vitest";
import {
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";
import ca from "../messages/ca.json";
import es from "../messages/es.json";
import en from "../messages/en.json";
import localeLabels from "../i18n/locale-labels.generated.json";

const STALE = "stale: run `yarn i18n:labels`";
const SKIP_DIRS = new Set(["node_modules", "test", "e2e", "scripts", "public"]);
const MESSAGES_JSON = /(^|\/)messages\/\w+\.json$/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry) || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".d.ts")) out.push(full);
  }
  return out;
}

// Runtime loads of messages/*.json: static imports, `export … from`, dynamic
// `import()` and `require()`. Type-only forms (`import type`,
// `typeof import()`) are erased at build time, so they are allowed.
function importsMessagesJson(file: string): boolean {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const isMessages = (node: ts.Node | undefined) =>
    !!node && ts.isStringLiteralLike(node) && MESSAGES_JSON.test(node.text);
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found) return;
    if (ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly) {
      found = isMessages(node.moduleSpecifier);
    } else if (ts.isExportDeclaration(node) && !node.isTypeOnly) {
      found = isMessages(node.moduleSpecifier);
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require"))
    ) {
      found = isMessages(node.arguments[0]);
    }
    if (!found) ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
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
  it("is the only messages source for app code outside i18n/request.ts", () => {
    const offenders = walk(".").filter(
      (file) => file !== join("i18n", "request.ts") && importsMessagesJson(file),
    );
    expect(offenders).toEqual([]);
  });

  it("detects every runtime import form and ignores type-only ones", () => {
    const check = (code: string) => {
      const file = join(tmpdir(), `locale-guard-${Date.now()}-${Math.random()}.ts`);
      writeFileSync(file, code);
      try {
        return importsMessagesJson(file);
      } finally {
        rmSync(file);
      }
    };
    expect(check('import ca from "../messages/ca.json";')).toBe(true);
    expect(check('export { default } from "../messages/ca.json";')).toBe(true);
    expect(check('const m = () => import("../messages/es.json");')).toBe(true);
    expect(check('const m = require("../../messages/en.json");')).toBe(true);
    expect(check('import type M from "../messages/ca.json";')).toBe(false);
    expect(check('type M = typeof import("../messages/ca.json");')).toBe(false);
    expect(check('import x from "../other/messages.json";')).toBe(false);
  });
});
