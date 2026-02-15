/**
 * Lead generation script — extract potential sponsor contacts from events data.
 *
 * What it does:
 * 1. Paginates through ALL events from the API
 * 2. Extracts unique businesses/councils by domain
 * 3. Visits each website's contact page to find public email addresses
 * 4. Outputs a CSV file ready for outreach
 *
 * Output: scripts/output/leads.csv
 *
 * Usage:
 *   export $(grep -E '^(NEXT_PUBLIC_API_URL|HMAC_SECRET)=' .env.production | xargs)
 *   node scripts/generate-leads.mjs
 *
 * Note: Email scraping only looks at public /contacte, /contacta, /contact pages.
 * This is publicly available information, not private data.
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const HMAC_SECRET = process.env.HMAC_SECRET || "";

if (!API_URL) {
  console.error("❌ NEXT_PUBLIC_API_URL must be set");
  process.exit(1);
}

/** Page size for API requests */
const PAGE_SIZE = 100;

/** Delay between contact page requests (ms) — be polite */
const SCRAPE_DELAY_MS = 500;

/** Timeout for contact page fetch (ms) */
const CONTACT_FETCH_TIMEOUT_MS = 8000;

/** Contact page paths to try */
const CONTACT_PATHS = [
  "/contacte",
  "/contacta",
  "/contact",
  "/contacto",
  "/contacte/",
  "/contacta/",
  "/contact/",
  "/contacto/",
];

/**
 * Sign a request with HMAC (mirrors fetchWithHmac + buildStringToSign).
 */
function signRequest(url) {
  if (!HMAC_SECRET) return {};
  const timestamp = Date.now();
  const urlObject = new URL(url);
  const pathAndQuery = urlObject.pathname + urlObject.search;
  const stringToSign = `${timestamp}${pathAndQuery}`;
  const signature = crypto
    .createHmac("sha256", HMAC_SECRET)
    .update(stringToSign)
    .digest("hex");
  return { "x-hmac": signature, "x-timestamp": String(timestamp) };
}

/**
 * Extract the domain from a URL, stripping www.
 */
function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Extract the origin (scheme + host) from a URL.
 */
function extractOrigin(url) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * Domains to skip — social media, aggregators, generic platforms.
 */
const SKIP_DOMAINS = [
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "youtube.com",
  "tiktok.com",
  "linkedin.com",
  "eventbrite.com",
  "meetup.com",
  "google.com",
  "gov.cat",
  "gencat.cat",
  "wikipedia.org",
  "esdeveniments.cat",
  "ticketmaster.com",
  "spotify.com",
  "whatsapp.com",
  "t.me",
  "bit.ly",
  "wa.me",
];

function isBusinessUrl(url) {
  if (!url) return false;
  const domain = extractDomain(url);
  if (!domain) return false;
  return !SKIP_DOMAINS.some(
    (skip) => domain === skip || domain.endsWith(`.${skip}`),
  );
}

/**
 * Clean up a location string.
 */
function cleanLocationName(location) {
  if (!location) return null;
  let cleaned = location
    .replace(/^(?:lugar|lloc)\s*:\s*/i, "")
    .replace(
      /\s*[-–·|,]\s*(Barcelona|Catalunya|Girona|Lleida|Tarragona|Maresme).*$/i,
      "",
    )
    .replace(/\s*\(.*\)\s*$/, "")
    .trim();
  if (cleaned.length < 3 || cleaned.length > 80) return null;
  return cleaned;
}

/**
 * Fetch a page of events from the API.
 */
async function fetchEventsPage(page) {
  const url = `${API_URL}/events?size=${PAGE_SIZE}&page=${page}`;
  const headers = { Accept: "application/json", ...signRequest(url) };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      console.warn(`  ⚠️  Page ${page}: API returned ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (error) {
    clearTimeout(timeout);
    console.warn(`  ⚠️  Page ${page}: ${error.message}`);
    return null;
  }
}

/**
 * Extract email addresses from HTML text.
 * Looks for mailto: links and common email patterns.
 */
function extractEmails(html) {
  const emails = new Set();

  // mailto: links
  const mailtoRegex =
    /mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi;
  let match;
  while ((match = mailtoRegex.exec(html)) !== null) {
    emails.add(match[1].toLowerCase());
  }

  // Email patterns in text (more conservative to avoid false positives)
  const emailRegex =
    /\b([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.(?:cat|com|es|org|net))\b/gi;
  while ((match = emailRegex.exec(html)) !== null) {
    const email = match[1].toLowerCase();
    // Skip image/asset filenames that look like emails
    if (
      !email.endsWith(".png") &&
      !email.endsWith(".jpg") &&
      !email.endsWith(".svg") &&
      !email.includes("example") &&
      !email.includes("sentry")
    ) {
      emails.add(email);
    }
  }

  return [...emails];
}

/**
 * Try to find a contact email by visiting the website's contact page.
 */
async function findContactEmail(websiteOrigin) {
  for (const contactPath of CONTACT_PATHS) {
    const contactUrl = `${websiteOrigin}${contactPath}`;
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      CONTACT_FETCH_TIMEOUT_MS,
    );
    try {
      const res = await fetch(contactUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; esdeveniments.cat lead-gen/1.0)",
          Accept: "text/html",
        },
        redirect: "follow",
      });
      clearTimeout(timeout);

      if (res.ok) {
        const html = await res.text();
        const emails = extractEmails(html);
        if (emails.length > 0) {
          return emails;
        }
      }
    } catch {
      clearTimeout(timeout);
      // Try next path
    }
  }

  // Last resort: try homepage
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    CONTACT_FETCH_TIMEOUT_MS,
  );
  try {
    const res = await fetch(websiteOrigin, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; esdeveniments.cat lead-gen/1.0)",
        Accept: "text/html",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (res.ok) {
      const html = await res.text();
      return extractEmails(html);
    }
  } catch {
    clearTimeout(timeout);
  }

  return [];
}

/**
 * Sleep helper.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Escape a CSV field (handle commas, quotes, newlines).
 */
function csvEscape(value) {
  if (!value) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function main() {
  console.log("🔍 Lead Generation — Extracting businesses from events data\n");

  // Step 1: Paginate through ALL events
  console.log("📥 Step 1: Fetching all events from API...");
  let page = 0;
  let isLast = false;
  let totalEvents = 0;

  // Map: domain → lead info
  const leads = new Map();

  while (!isLast) {
    const data = await fetchEventsPage(page);
    if (!data || !data.content) break;

    if (page === 0) {
      console.log(`   Total events in API: ${data.totalElements}`);
      console.log(`   Pages to fetch: ${data.totalPages}\n`);
    }

    for (const event of data.content) {
      totalEvents++;

      if (!isBusinessUrl(event.url)) continue;

      const domain = extractDomain(event.url);
      if (!domain) continue;

      const origin = extractOrigin(event.url);
      if (!origin) continue;

      // If we already have this domain, just increment event count and add visits
      if (leads.has(domain)) {
        const existing = leads.get(domain);
        existing.eventCount++;
        existing.totalVisits += event.visits || 0;
        // Keep the location with most visits
        if ((event.visits || 0) > existing.bestVisits) {
          existing.bestVisits = event.visits || 0;
          const locationName = cleanLocationName(event.location);
          if (locationName) existing.locationName = locationName;
        }
        continue;
      }

      const locationName = cleanLocationName(event.location);

      leads.set(domain, {
        domain,
        websiteOrigin: origin,
        locationName: locationName || event.city?.name || domain,
        cityName: event.city?.name || "",
        citySlug: event.city?.slug || "",
        regionName: event.region?.name || "",
        regionSlug: event.region?.slug || "",
        eventCount: 1,
        totalVisits: event.visits || 0,
        bestVisits: event.visits || 0,
        emails: [],
      });
    }

    isLast = data.last;
    page++;

    // Progress every 5 pages
    if (page % 5 === 0) {
      process.stdout.write(`   Fetched page ${page}/${data.totalPages}...\r`);
    }
  }

  console.log(
    `\n✅ Processed ${totalEvents} events → ${leads.size} unique domains\n`,
  );

  // Step 2: Sort by total visits (most active businesses first)
  const sortedLeads = [...leads.values()].sort(
    (a, b) => b.totalVisits - a.totalVisits,
  );

  // Step 3: Find contact emails
  console.log("📧 Step 2: Scraping contact emails from websites...\n");
  let emailsFound = 0;
  let processed = 0;

  for (const lead of sortedLeads) {
    processed++;
    process.stdout.write(
      `   [${processed}/${sortedLeads.length}] ${lead.domain}...\r`,
    );

    const emails = await findContactEmail(lead.websiteOrigin);
    if (emails.length > 0) {
      lead.emails = emails;
      emailsFound++;
    }

    // Be polite — don't hammer servers
    await sleep(SCRAPE_DELAY_MS);
  }

  console.log(
    `\n\n✅ Found emails for ${emailsFound}/${sortedLeads.length} websites\n`,
  );

  // Step 4: Write CSV
  const outputDir = path.join(__dirname, "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const csvPath = path.join(outputDir, "leads.csv");
  const headers = [
    "Business Name",
    "City",
    "Region",
    "Website",
    "Emails",
    "Events Count",
    "Total Visits",
    "City Slug (for sponsor targeting)",
  ];

  const rows = sortedLeads.map((lead) => [
    csvEscape(lead.locationName),
    csvEscape(lead.cityName),
    csvEscape(lead.regionName),
    csvEscape(lead.websiteOrigin),
    csvEscape(lead.emails.join("; ")),
    lead.eventCount,
    lead.totalVisits,
    csvEscape(lead.citySlug),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  fs.writeFileSync(csvPath, csv, "utf-8");

  console.log(`📄 CSV saved to: scripts/output/leads.csv`);
  console.log(`   Total leads: ${sortedLeads.length}`);
  console.log(`   With emails: ${emailsFound}`);
  console.log(`   Without emails: ${sortedLeads.length - emailsFound}\n`);

  // Print top 10 leads
  console.log("🏆 Top 10 leads by visits:\n");
  console.log(
    "   " +
      ["#", "Name", "City", "Region", "Events", "Visits", "Email"]
        .map((h) => h.padEnd(20))
        .join(""),
  );
  console.log("   " + "-".repeat(140));

  for (let i = 0; i < Math.min(10, sortedLeads.length); i++) {
    const lead = sortedLeads[i];
    console.log(
      "   " +
        [
          String(i + 1),
          lead.locationName,
          lead.cityName,
          lead.regionName,
          String(lead.eventCount),
          String(lead.totalVisits),
          lead.emails[0] || "—",
        ]
          .map((v) => v.substring(0, 19).padEnd(20))
          .join(""),
    );
  }
}

main().catch((err) => {
  console.error("❌ Fatal error:", err.message);
  process.exit(1);
});
