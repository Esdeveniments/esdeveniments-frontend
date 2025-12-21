import * as cheerio from "cheerio";

const DEFAULT_LOCALE = "ca";
const locales = ["ca", "es", "en"];

// Configurable base URL (supports localhost, staging, preview)
const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";

const paths = [
  '/',
  '/catalunya',
  '/catalunya/avui',
  '/catalunya/avui/festes-populars',
  '/noticies',
  '/noticies/mataro/que-fer-el-cap-de-setmana-del-6-al-7-de-desembre-del-2025-a-mataro-d0a817fa-349d-4ef5-9f53-2eb042f446f6',
  '/e/festival-de-nadal-de-lescola-i-fira-de-nadal-18-de-desembre-del-2025-afa306c7-4812-44fe-bd8c-c716cd1eb5ce',
  '/publica',
  '/qui-som',
  '/sitemap',
  '/sitemap/mataro',
  '/offline'
];

function buildUrl(path, locale) {
  const localizedPath =
    locale === DEFAULT_LOCALE ? path : `/${locale}${path}`;
  return new URL(localizedPath, baseUrl).toString();
}

function normalizeUrl(value, base) {
  try {
    const u = new URL(value, base);
    return `${u.origin}${u.pathname}${u.search}`;
  } catch {
    return value;
  }
}

function extractJsonLdNodes(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data.flatMap(extractJsonLdNodes);
  if (typeof data !== "object") return [];

  const obj = data;
  const graph = Array.isArray(obj["@graph"]) ? obj["@graph"] : null;
  if (graph) return graph.flatMap(extractJsonLdNodes);
  return [obj];
}

function assertNoDoubleLocale(pathname, errors) {
  // Guard against /es/es/... (or en/en, ca/ca)
  if (/\/(ca|es|en)\/\1(\/|$)/.test(pathname)) {
    errors.push(`double-locale-prefix in URL path: ${pathname}`);
  }
}

function assertLocalePrefix(pathname, locale, errors) {
  if (locale === DEFAULT_LOCALE) {
    if (/^\/(es|en)(\/|$)/.test(pathname) || /^\/ca(\/|$)/.test(pathname)) {
      errors.push(`default locale should not be prefixed: ${pathname}`);
    }
    return;
  }

  if (!(pathname === `/${locale}` || pathname.startsWith(`/${locale}/`))) {
    errors.push(`expected /${locale} prefix in path: ${pathname}`);
  }
}

async function check() {
  let totalErrors = 0;

  console.log(`Base URL: ${baseUrl}`);

  for (const path of paths) {
    console.log(`\n=== Path: ${path} ===`);
    for (const locale of locales) {
      const url = buildUrl(path, locale);
      console.log(`\n--- URL: ${url} (${locale}) ---`);
      const errors = [];
      
      try {
        const response = await fetch(url, { redirect: "follow" });
        if (!response.ok) {
          errors.push(`HTTP ${response.status}`);
        }
        const html = await response.text();

        const $ = cheerio.load(html);
        
        // --- HTML lang ---
        const htmlLang = $("html").attr("lang") ?? "";
        console.log(`HTML Lang: ${htmlLang || "NOT FOUND"}`);
        if (!htmlLang) {
          errors.push("missing <html lang>");
        } else if (!htmlLang.toLowerCase().startsWith(locale)) {
          errors.push(`html lang mismatch: expected ${locale}, got ${htmlLang}`);
        }

        // --- Canonical ---
        const canonicalHrefRaw = $("link[rel=\"canonical\"]").attr("href") ?? "";
        const canonicalHref = canonicalHrefRaw
          ? normalizeUrl(canonicalHrefRaw, url)
          : "";
        console.log(`Canonical: ${canonicalHref || "NOT FOUND"}`);
        if (!canonicalHref) {
          errors.push("missing canonical link");
        } else {
          try {
            const canonicalUrl = new URL(canonicalHref, url);
            assertNoDoubleLocale(canonicalUrl.pathname, errors);
            assertLocalePrefix(canonicalUrl.pathname, locale, errors);
          } catch {
            errors.push(`invalid canonical URL: ${canonicalHref}`);
          }
        }

        // --- Alternates ---
        const alternates = {};
        $("link[rel=\"alternate\"][hreflang]").each((_, el) => {
          const hreflang = $(el).attr("hreflang") ?? "";
          const href = $(el).attr("href") ?? "";
          if (!hreflang || !href) return;
          alternates[hreflang] = normalizeUrl(href, url);
        });

        const required = ["ca", "es", "en", "x-default"];
        for (const key of required) {
          if (!alternates[key]) {
            errors.push(`missing alternate hreflang=${key}`);
          }
        }

        // Print alternates
        console.log("Alternates:");
        Object.entries(alternates)
          .sort(([a], [b]) => a.localeCompare(b))
          .forEach(([k, v]) => console.log(`  ${k}: ${v}`));

        // Validate alternates paths
        for (const [hreflang, href] of Object.entries(alternates)) {
          try {
            const u = new URL(href, url);
            assertNoDoubleLocale(u.pathname, errors);

            if (hreflang === "x-default") {
              // must point to default locale
              assertLocalePrefix(u.pathname, DEFAULT_LOCALE, errors);
            }
            if (hreflang === "ca" || hreflang === "es" || hreflang === "en") {
              assertLocalePrefix(u.pathname, hreflang, errors);
            }
          } catch {
            errors.push(`invalid alternate URL (${hreflang}): ${href}`);
          }
        }

        if (alternates["ca"] && alternates["x-default"]) {
          if (alternates["x-default"] !== alternates["ca"]) {
            errors.push("x-default must match ca alternate");
          }
        }
        
        // Extract OG locale
        const ogLocale = $("meta[property=\"og:locale\"]").attr("content") ?? "";
        console.log(`OG Locale: ${ogLocale || "NOT FOUND"}`);

        // --- JSON-LD ---
        const jsonLdScripts = $("script[type=\"application/ld+json\"]")
          .toArray()
          .map((el) => $(el).text());
        console.log(`JSON-LD tags found: ${jsonLdScripts.length}`);

        let foundMatchingInLanguage = false;
        let foundEventWithCorrectLocale = false;

        for (const [i, content] of jsonLdScripts.entries()) {
          if (!content || !content.trim()) continue;
          try {
            const parsed = JSON.parse(content);
            const nodes = extractJsonLdNodes(parsed);
            const types = nodes
              .map((n) => n?.["@type"])
              .flatMap((t) => (Array.isArray(t) ? t : [t]))
              .filter((t) => typeof t === "string");

            const nodeInLanguages = nodes
              .map((n) => n?.inLanguage)
              .filter((v) => typeof v === "string");
            if (nodeInLanguages.some((v) => v === locale)) {
              foundMatchingInLanguage = true;
            }

            // On event detail pages, ensure at least one Event node is localized
            if (path.startsWith("/e/")) {
              for (const node of nodes) {
                const t = node?.["@type"];
                const isEvent =
                  t === "Event" || (Array.isArray(t) && t.includes("Event"));
                if (!isEvent) continue;
                if (node?.inLanguage !== locale) continue;
                const href = node?.url || node?.["@id"];
                if (typeof href !== "string") continue;
                const u = new URL(href, url);
                const localErrors = [];
                assertNoDoubleLocale(u.pathname, localErrors);
                assertLocalePrefix(u.pathname, locale, localErrors);
                if (localErrors.length === 0) {
                  foundEventWithCorrectLocale = true;
                  break;
                }
              }
            }

            const typeSummary = types.length ? Array.from(new Set(types)).join(",") : "unknown";
            const inLangSummary = nodeInLanguages.length
              ? Array.from(new Set(nodeInLanguages)).join(",")
              : "none";
            console.log(`  JSON-LD ${i + 1}: @type=${typeSummary} inLanguage=${inLangSummary}`);
          } catch {
            errors.push(`invalid JSON-LD (script ${i + 1})`);
          }
        }

        // Require at least one localized inLanguage value (regression guard)
        if (jsonLdScripts.length > 0 && !foundMatchingInLanguage) {
          errors.push(`no JSON-LD node with inLanguage=${locale}`);
        }

        if (path.startsWith("/e/") && !foundEventWithCorrectLocale) {
          errors.push("no localized Event JSON-LD found");
        }

      } catch (err) {
        errors.push(`fetch error: ${err.message}`);
      }

      if (errors.length > 0) {
        totalErrors += errors.length;
        console.log("RESULT: FAIL");
        errors.forEach((e) => console.log(`  - ${e}`));
      } else {
        console.log("RESULT: PASS");
      }
    }
  }

  if (totalErrors > 0) {
    console.error(`\nLocalization check failed with ${totalErrors} error(s).`);
    process.exitCode = 1;
  } else {
    console.log("\nLocalization check passed.");
  }
}

check();

