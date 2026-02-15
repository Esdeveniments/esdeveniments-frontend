/**
 * Converts business-leads-outreach.csv into a single JSON for Pipedream.
 * Each entry has: email, town, citySlug.
 * Subject and email body are templated in Pipedream using town/citySlug.
 *
 * Output: scripts/output/pipedream/all-businesses.json
 *
 * Pipedream subject template:
 *   Pregunta ràpida sobre {{town}}
 *
 * Usage:
 *   node scripts/generate-pipedream-lists.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse CSV line handling quoted fields.
 */
function parseCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

function main() {
  const inputPath = path.join(
    __dirname,
    "output",
    "business-leads-outreach.csv",
  );
  if (!fs.existsSync(inputPath)) {
    console.error(
      "❌ business-leads-outreach.csv not found. Run clean-business-leads.mjs first.",
    );
    process.exit(1);
  }

  const content = fs.readFileSync(inputPath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());

  // Build entries
  const allBusinesses = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length < 8) continue;

    const [
      name,
      category,
      email,
      town,
      region,
      councilWebsite,
      citySlug,
      outreachCategory,
    ] = fields;

    if (!email) continue;

    const entry = {
      email,
      town,
      citySlug,
    };

    allBusinesses.push(entry);
  }

  // Write output
  const outputDir = path.join(__dirname, "output", "pipedream");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  // Single file with all businesses (indexed for Pipedream)
  const allIndexed = {};
  allBusinesses.forEach((item, idx) => {
    allIndexed[String(idx)] = item;
  });
  const allPath = path.join(outputDir, "all-businesses.json");
  fs.writeFileSync(allPath, JSON.stringify(allIndexed, null, 2), "utf-8");

  // Stats
  console.log(`📦 all-businesses.json — ${allBusinesses.length} leads`);
  console.log(`\nEach entry has: email, town, citySlug`);
  console.log(`\n📁 Output: ${outputDir}`);
}

main();
