// Writes i18n/locale-labels.generated.json: the few message subtrees that
// shared utils (utils/constants.ts, date/string helpers, ...) read at import
// time. Those utils also run in client components, and the bundler ships an
// imported JSON file whole, so importing messages/*.json there put all three
// locale files (~230 KB) into the browser. Re-run after editing these keys:
//   yarn i18n:labels
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCALES = ["ca", "es", "en"];
const UTILS_KEYS = [
  "EventCopy",
  "EventStatus",
  "EventTime",
  "OpeningHours",
  "StringHelpers",
];

const read = (locale) =>
  JSON.parse(fs.readFileSync(path.join(root, "messages", `${locale}.json`), "utf8"));

const messages = Object.fromEntries(LOCALES.map((l) => [l, read(l)]));
const labels = {
  constants: Object.fromEntries(
    LOCALES.map((l) => [l, messages[l].Components.Constants]),
  ),
  utils: Object.fromEntries(UTILS_KEYS.map((k) => [k, messages.ca.Utils[k]])),
};

const out = path.join(root, "i18n", "locale-labels.generated.json");
fs.writeFileSync(out, `${JSON.stringify(labels, null, 2)}\n`);
console.log(`Wrote ${path.relative(root, out)}`);
