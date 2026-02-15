/**
 * Cleans business-leads.csv and generates a filtered outreach-ready CSV.
 *
 * What it does:
 * 1. Decodes HTML entities in categories/names
 * 2. Removes non-business entries (government, schools, police, etc.)
 * 3. Removes entries without email
 * 4. Removes government/institutional email domains (@diba.cat, @gencat.cat, @xtec.cat, etc.)
 * 5. Categorizes businesses for easier outreach prioritization
 * 6. Outputs two files:
 *    - business-leads-clean.csv   — all cleaned leads with email
 *    - business-leads-outreach.csv — high-priority businesses only (restaurants, hotels, shops, services)
 *
 * Usage:
 *   node scripts/clean-business-leads.mjs
 *
 * Prerequisites:
 *   Run scrape-business-leads.mjs first to create scripts/output/business-leads.csv
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── HTML Entity Decoding ───────────────────────────────────────────────────

const HTML_ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
  "&nbsp;": " ",
  "&agrave;": "à",
  "&aacute;": "á",
  "&egrave;": "è",
  "&eacute;": "é",
  "&igrave;": "ì",
  "&iacute;": "í",
  "&ograve;": "ò",
  "&oacute;": "ó",
  "&ugrave;": "ù",
  "&uacute;": "ú",
  "&uuml;": "ü",
  "&Agrave;": "À",
  "&Aacute;": "Á",
  "&Egrave;": "È",
  "&Eacute;": "É",
  "&Igrave;": "Ì",
  "&Iacute;": "Í",
  "&Ograve;": "Ò",
  "&Oacute;": "Ó",
  "&Ugrave;": "Ù",
  "&Uacute;": "Ú",
  "&Uuml;": "Ü",
  "&ccedil;": "ç",
  "&Ccedil;": "Ç",
  "&ntilde;": "ñ",
  "&Ntilde;": "Ñ",
  "&middot;": "·",
  "&rsquo;": "'",
  "&lsquo;": "'",
  "&rdquo;": "\u201D",
  "&ldquo;": "\u201C",
  "&ndash;": "–",
  "&mdash;": "—",
  "&hellip;": "…",
  "&euro;": "€",
  "&copy;": "©",
  "&reg;": "®",
  "&trade;": "™",
  "&iuml;": "ï",
  "&Iuml;": "Ï",
};

function decodeHtmlEntities(text) {
  if (!text) return "";
  let result = text;
  // Named entities
  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    result = result.replaceAll(entity, char);
  }
  // Numeric entities (&#123; or &#x1F;)
  result = result.replace(/&#(\d+);/g, (_, code) =>
    String.fromCharCode(parseInt(code, 10)),
  );
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
    String.fromCharCode(parseInt(code, 16)),
  );
  // Clean up multiple spaces and trim
  return result.replace(/\s+/g, " ").trim();
}

// ─── Non-Business Filters ───────────────────────────────────────────────────

/** Names that indicate government/institutional entries */
const SKIP_NAME_PATTERNS = [
  // Government
  "ajuntament",
  "regidor",
  "secretari",
  "interventor",
  "tresor",
  "alcald",
  "oficina d'atenció",
  "oficina d'atenció",
  "oac",
  "serveis socials",
  "protecció civil",
  "agrupació defensa forestal",
  "adf ",
  // Police / emergency
  "mossos",
  "policia",
  "bombers",
  "guàrdia civil",
  "guardia civil",
  // Education (public)
  "ceip ",
  "ceip-",
  "escola bressol",
  "escola pública",
  "escola de música",
  "aula de música",
  "aula de formació",
  "institut ",
  "zer ",
  "zer-",
  "llar d'infants",
  // Social / elderly
  "llar del jubilat",
  "llar dels jubilat",
  "casal de la gent gran",
  "casal d'avis",
  // Health (public)
  "consultori local",
  "consultori (cap",
  "centre d'atenció primària",
  "cap -",
  "cap(",
  // Post / utilities
  "correos",
  "correus",
  // Other government
  "generalitat",
  "diputació",
  "consell comarcal",
  "jutjat",
  "registre civil",
  "agència tributària",
  "comunitat de regants",
  // Religious
  "parròquia",
  "parroquia",
  // Libraries (public)
  "biblioteca ",
  "biblioteca-",
];

/** Max length for a business name (longer = likely a description, not a name) */
const MAX_NAME_LENGTH = 80;

/** Email domains that indicate government/institutional */
const SKIP_EMAIL_DOMAINS = [
  "@diba.cat",
  "@gencat.cat",
  "@xtec.cat",
  "@centres.xtec.es",
  "@xtec.es",
  "@aoc.cat",
  "@eacat.cat",
];

/** Generic / catch-all emails to skip (not useful for outreach) */
const SKIP_EMAIL_PATTERNS = [
  "noreply@",
  "no-reply@",
  "info@aj",
  "oac@",
  "registre@",
];

function shouldSkipEntry(name, email) {
  const decodedName = decodeHtmlEntities(name);
  const lowerName = decodedName.toLowerCase();
  const lowerEmail = (email || "").toLowerCase();

  // Skip entries where "name" is really a description (too long)
  if (decodedName.length > MAX_NAME_LENGTH) return true;

  // Skip by name
  if (SKIP_NAME_PATTERNS.some((p) => lowerName.includes(p))) return true;

  // Skip by email domain
  if (SKIP_EMAIL_DOMAINS.some((d) => lowerEmail.endsWith(d))) return true;

  // Skip by email pattern
  if (SKIP_EMAIL_PATTERNS.some((p) => lowerEmail.includes(p))) return true;

  return false;
}

// ─── Business Categorization (for outreach prioritization) ──────────────────

const BUSINESS_CATEGORIES = [
  {
    label: "🍽️ Restaurant/Bar",
    patterns: [
      "restaurant",
      "bar ",
      "bar-",
      "cafeteria",
      "cafè",
      "pizzeria",
      "cerveseria",
      "marisqueria",
      "braseria",
      "creperia",
      "kebab",
      "wok",
      "sushi",
      "granja",
      "tasca",
    ],
  },
  {
    label: "🏨 Allotjament",
    patterns: [
      "hotel",
      "hostal",
      "pensió",
      "allotjament",
      "turisme rural",
      "casa rural",
      "càmping",
      "camping",
      "apartament turístic",
    ],
  },
  {
    label: "🛍️ Comerç",
    patterns: [
      "botiga",
      "comerç",
      "supermercat",
      "mercat",
      "alimentació",
      "fruiter",
      "carnisseria",
      "xarcuteria",
      "peix",
      "fleca",
      "forn ",
      "forn-",
      "pastisseria",
      "floristeria",
      "joieria",
      "rellotgeria",
      "perfumeria",
      "optic",
      "papereria",
      "llibreria",
      "ferreteria",
      "electrodomèstic",
      "moble",
      "decoració",
      "roba",
      "moda",
      "calçat",
      "complement",
      "regal",
      "estanc",
      "drogueria",
      "herboristeria",
    ],
  },
  {
    label: "💇 Bellesa/Salut",
    patterns: [
      "perruqueria",
      "bellesa",
      "estètica",
      "spa",
      "ioga",
      "yoga",
      "gimnàs",
      "fitness",
      "fisioteràpia",
      "fisio",
      "massatge",
      "dental",
      "clínica",
      "consulta",
      "veterinari",
      "farmàci",
    ],
  },
  {
    label: "🎭 Cultura/Oci",
    patterns: [
      "teatre",
      "cinema",
      "museu",
      "galeria d'art",
      "música",
      "dansa",
      "ball ",
      "ball-",
      "cultural",
      "ateneu",
      "centre cív",
      "lúdic",
      "lleure",
      "esport",
    ],
  },
  {
    label: "🔧 Serveis",
    patterns: [
      "immobili",
      "fotograf",
      "impremta",
      "gestoria",
      "assessor",
      "asseguranç",
      "autoescola",
      "taxi",
      "taller mecànic",
      "taller de ",
      "mecànic",
      "elèctric",
      "fontaner",
      "reformes",
      "pintura",
      "jardiner",
      "neteja",
      "informàtic",
    ],
  },
  {
    label: "🍷 Celler/Bodega",
    patterns: ["celler", "bodega", "vi ", "vins ", "caves", "cava "],
  },
];

function categorizeBusinessForOutreach(name, originalCategory) {
  const combined = `${name} ${originalCategory}`.toLowerCase();
  const decoded = decodeHtmlEntities(combined);

  for (const cat of BUSINESS_CATEGORIES) {
    if (cat.patterns.some((p) => decoded.includes(p))) {
      return cat.label;
    }
  }
  return "📦 Altres";
}

/** High-priority categories for the outreach CSV (skip "Altres") */
const HIGH_PRIORITY_LABELS = BUSINESS_CATEGORIES.map((c) => c.label);

// ─── CSV Parsing ────────────────────────────────────────────────────────────

/**
 * Parse CSV handling quoted fields with commas inside.
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

function csvEscape(value) {
  if (!value) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  console.log("🧹 Cleaning business leads...\n");

  const inputPath = path.join(__dirname, "output", "business-leads.csv");
  if (!fs.existsSync(inputPath)) {
    console.error(
      "❌ business-leads.csv not found. Run scrape-business-leads.mjs first.",
    );
    process.exit(1);
  }

  const content = fs.readFileSync(inputPath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());

  console.log(`📥 Input: ${lines.length - 1} entries (excl. header)\n`);

  // Stats
  let skippedNoEmail = 0;
  let skippedGovernment = 0;
  let skippedDuplicate = 0;
  let totalCleaned = 0;
  let totalOutreach = 0;

  const seenEmails = new Set();
  const cleanedRows = [];
  const outreachRows = [];

  // Category stats for outreach
  const categoryStats = {};

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length < 7) continue;

    const [
      rawName,
      rawCategory,
      email,
      town,
      region,
      councilWebsite,
      citySlug,
    ] = fields;

    // 1. Remove entries without email
    if (!email || !email.trim()) {
      skippedNoEmail++;
      continue;
    }

    // 2. Decode HTML entities
    const name = decodeHtmlEntities(rawName);
    const category = decodeHtmlEntities(rawCategory);

    // 3. Remove non-business entries
    if (shouldSkipEntry(name, email)) {
      skippedGovernment++;
      continue;
    }

    // 4. Deduplicate by email
    const emailLower = email.trim().toLowerCase();
    if (seenEmails.has(emailLower)) {
      skippedDuplicate++;
      continue;
    }
    seenEmails.add(emailLower);

    // 5. Categorize
    const outreachCategory = categorizeBusinessForOutreach(name, category);

    totalCleaned++;

    const row = [
      csvEscape(name),
      csvEscape(category),
      csvEscape(emailLower),
      csvEscape(town),
      csvEscape(region),
      csvEscape(councilWebsite),
      csvEscape(citySlug),
      csvEscape(outreachCategory),
    ];

    cleanedRows.push(row);

    // 6. Filter high-priority for outreach CSV
    if (HIGH_PRIORITY_LABELS.includes(outreachCategory)) {
      totalOutreach++;
      outreachRows.push(row);
      categoryStats[outreachCategory] =
        (categoryStats[outreachCategory] || 0) + 1;
    }
  }

  // Sort both lists by town then name
  const sortFn = (a, b) => a[3].localeCompare(b[3]) || a[0].localeCompare(b[0]);
  cleanedRows.sort(sortFn);
  outreachRows.sort(sortFn);

  // Write files
  const outputDir = path.join(__dirname, "output");
  const headers = [
    "Business Name",
    "Category",
    "Email",
    "Town",
    "Region",
    "Council Website",
    "City Slug",
    "Outreach Category",
  ];
  const headerLine = headers.join(",");

  // Clean CSV (all with email, non-government)
  const cleanPath = path.join(outputDir, "business-leads-clean.csv");
  fs.writeFileSync(
    cleanPath,
    [headerLine, ...cleanedRows.map((r) => r.join(","))].join("\n"),
    "utf-8",
  );

  // Outreach CSV (high-priority only)
  const outreachPath = path.join(outputDir, "business-leads-outreach.csv");
  fs.writeFileSync(
    outreachPath,
    [headerLine, ...outreachRows.map((r) => r.join(","))].join("\n"),
    "utf-8",
  );

  // Summary
  console.log("=".repeat(60));
  console.log("📊 RESULTS\n");
  console.log(`   Input entries:           ${lines.length - 1}`);
  console.log(`   Skipped (no email):      ${skippedNoEmail}`);
  console.log(`   Skipped (government):    ${skippedGovernment}`);
  console.log(`   Skipped (duplicate):     ${skippedDuplicate}`);
  console.log(`   ─────────────────────────────`);
  console.log(`   Clean leads (with email): ${totalCleaned}`);
  console.log(`   Outreach-ready leads:     ${totalOutreach}`);

  console.log(`\n📁 Output files:`);
  console.log(`   ${cleanPath}`);
  console.log(`   ${outreachPath}`);

  // Category breakdown
  console.log(`\n📊 Outreach by category:\n`);
  const sortedCategories = Object.entries(categoryStats).sort(
    (a, b) => b[1] - a[1],
  );
  for (const [cat, count] of sortedCategories) {
    console.log(`   ${cat.padEnd(25)} ${count}`);
  }

  // Top towns in outreach
  const townCounts = {};
  for (const row of outreachRows) {
    const town = row[3];
    townCounts[town] = (townCounts[town] || 0) + 1;
  }
  const topTowns = Object.entries(townCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log(`\n🏘️  Top 10 towns (outreach-ready):\n`);
  for (const [town, count] of topTowns) {
    console.log(`   ${town.padEnd(30)} ${count} leads`);
  }

  // Sample outreach leads
  const samples = outreachRows.slice(0, 15);
  if (samples.length > 0) {
    console.log(`\n📧 Sample outreach leads:\n`);
    for (const row of samples) {
      const [name, , email, town, , , , cat] = row;
      console.log(
        `   ${cat} ${name.substring(0, 28).padEnd(30)} ${town.padEnd(22)} ${email}`,
      );
    }
  }
}

main();
