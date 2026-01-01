#!/usr/bin/env node
/**
 * Validates that translation placeholders match what the code provides.
 * Run with: node scripts/validate-i18n-placeholders.mjs
 *
 * This script:
 * 1. Parses all translation files to find placeholders like {year}, {month}, etc.
 * 2. Scans TypeScript files for translation calls
 * 3. Reports mismatches between expected and provided placeholders
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const MESSAGES_DIR = "./messages";
const SOURCE_DIRS = ["./components", "./app", "./lib", "./utils"];

// Extract placeholders from a translation string like "Hello {name}, welcome to {place}"
// Also handles ICU plural/select: "{count, plural, one {# item} other {# items}}"
function extractPlaceholders(str) {
  // Simple placeholders: {name}
  // ICU format: {count, plural, ...} or {gender, select, ...}
  const placeholders = [];
  let depth = 0;
  let current = "";
  let inPlaceholder = false;
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === "{") {
      if (depth === 0) {
        inPlaceholder = true;
        current = "";
      }
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0 && inPlaceholder) {
        // Extract the variable name (before comma for ICU format)
        const varName = current.split(",")[0].trim();
        if (varName && /^[a-zA-Z_]\w*$/.test(varName)) {
          placeholders.push(varName);
        }
        inPlaceholder = false;
      }
    } else if (inPlaceholder && depth === 1) {
      current += char;
    }
  }
  
  return placeholders;
}

// Recursively get all translation keys and their placeholders
function getTranslationPlaceholders(obj, prefix = "") {
  const result = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "string") {
      const placeholders = extractPlaceholders(value);
      if (placeholders.length > 0) {
        result[fullKey] = {
          placeholders,
          template: value.substring(0, 80) + (value.length > 80 ? "..." : ""),
        };
      }
    } else if (typeof value === "object" && value !== null) {
      Object.assign(result, getTranslationPlaceholders(value, fullKey));
    }
  }

  return result;
}

// Get all .ts/.tsx files recursively
function getSourceFiles(dir) {
  const files = [];

  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (
        stat.isDirectory() &&
        !entry.startsWith(".") &&
        entry !== "node_modules"
      ) {
        files.push(...getSourceFiles(fullPath));
      } else if (
        stat.isFile() &&
        (entry.endsWith(".ts") || entry.endsWith(".tsx"))
      ) {
        files.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist, skip
  }

  return files;
}

// Parse translation calls from source code
// Matches patterns like: t("key", { param1, param2 }) or t('key', { param1: value })
function parseTranslationCalls(content, filePath) {
  const calls = [];

  // Match t("key" or t('key' followed by optional params
  // This regex is simplified and may not catch all edge cases
  const regex = /\bt\s*\(\s*["'`]([^"'`]+)["'`]\s*(?:,\s*\{([^}]*)\})?\s*\)/g;

  let match;
  while ((match = regex.exec(content)) !== null) {
    const key = match[1];
    const paramsStr = match[2] || "";

    // Extract parameter names from { param1, param2: value, param3 }
    const params = [];
    if (paramsStr.trim()) {
      // Match param names - handles { month } and { month: value } and { month, year }
      // Split by comma and extract word before colon or end
      const parts = paramsStr.split(",");
      for (const part of parts) {
        const trimmed = part.trim();
        // Get the param name (before : if present)
        const colonIdx = trimmed.indexOf(":");
        const name = colonIdx >= 0 ? trimmed.slice(0, colonIdx).trim() : trimmed;
        // Validate it's a valid identifier (not a string/number literal)
        if (name && /^[a-zA-Z_]\w*$/.test(name) && 
            !["true", "false", "null", "undefined"].includes(name)) {
          params.push(name);
        }
      }
    }

    calls.push({
      key,
      params,
      file: filePath,
      line: content.substring(0, match.index).split("\n").length,
    });
  }

  return calls;
}

// Main validation
function validate() {
  console.log("🔍 Validating i18n placeholders...\n");

  // Load source translations (Catalan is the source of truth)
  const caPath = join(MESSAGES_DIR, "ca.json");
  const messages = JSON.parse(readFileSync(caPath, "utf-8"));
  const translationPlaceholders = getTranslationPlaceholders(messages);
  
  // Also collect ALL translation keys (to detect ambiguous simple keys)
  const allTranslationKeys = new Set();
  function collectAllKeys(obj, prefix = "") {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === "string") {
        allTranslationKeys.add(fullKey);
      } else if (typeof value === "object" && value !== null) {
        collectAllKeys(value, fullKey);
      }
    }
  }
  collectAllKeys(messages);

  console.log(
    `📝 Found ${
      Object.keys(translationPlaceholders).length
    } translations with placeholders\n`
  );

  // Get all source files
  const sourceFiles = SOURCE_DIRS.flatMap((dir) => getSourceFiles(dir));
  console.log(`📁 Scanning ${sourceFiles.length} source files...\n`);

  // Parse all translation calls
  const allCalls = [];
  for (const file of sourceFiles) {
    const content = readFileSync(file, "utf-8");
    const calls = parseTranslationCalls(content, file);
    allCalls.push(...calls);
  }

  console.log(`📞 Found ${allCalls.length} translation calls\n`);

  // Check for mismatches
  const errors = [];
  const warnings = [];

  for (const call of allCalls) {
    // Try to find the translation (handle namespaced keys)
    // The key in code might be "root.metaTitle" but full path is "Partials.GeneratePagesData.root.metaTitle"
    const matchingKeysWithPlaceholders = Object.keys(translationPlaceholders).filter((k) => {
      // Must match as a suffix with a dot separator (or exact match)
      return k === call.key || k.endsWith(`.${call.key}`);
    });

    if (matchingKeysWithPlaceholders.length === 0) {
      // No translations with placeholders match this key, that's fine
      continue;
    }
    
    // Check if there are other translations with the same key that DON'T have placeholders
    // This helps avoid false positives for ambiguous keys like "description"
    const allMatchingKeys = [...allTranslationKeys].filter((k) => {
      return k === call.key || k.endsWith(`.${call.key}`);
    });
    
    // If the key matches multiple namespaces (some with placeholders, some without),
    // we can't know which one the code is actually using, so skip
    if (allMatchingKeys.length > 1) {
      continue;
    }

    for (const fullKey of matchingKeysWithPlaceholders) {
      const expected = translationPlaceholders[fullKey];
      const provided = call.params;

      // Check for missing placeholders
      const missing = expected.placeholders.filter(
        (p) => !provided.includes(p)
      );

      if (missing.length > 0) {
        errors.push({
          file: relative(".", call.file),
          line: call.line,
          key: call.key,
          fullKey,
          missing,
          expected: expected.placeholders,
          provided,
          template: expected.template,
        });
      }

      // Check for extra placeholders (warning only)
      const extra = provided.filter((p) => !expected.placeholders.includes(p));
      if (extra.length > 0) {
        warnings.push({
          file: relative(".", call.file),
          line: call.line,
          key: call.key,
          extra,
          expected: expected.placeholders,
        });
      }
    }
  }

  // Report errors
  if (errors.length > 0) {
    console.log("❌ ERRORS: Missing placeholders\n");
    for (const err of errors) {
      console.log(`  ${err.file}:${err.line}`);
      console.log(`    Key: ${err.key}`);
      console.log(`    Template: "${err.template}"`);
      console.log(`    Missing: ${err.missing.join(", ")}`);
      console.log(`    Expected: {${err.expected.join(", ")}}`);
      console.log(`    Provided: {${err.provided.join(", ") || "none"}}`);
      console.log("");
    }
  }

  // Report warnings
  if (warnings.length > 0) {
    console.log("⚠️  WARNINGS: Extra placeholders provided\n");
    for (const warn of warnings) {
      console.log(`  ${warn.file}:${warn.line}`);
      console.log(`    Key: ${warn.key}`);
      console.log(`    Extra: ${warn.extra.join(", ")}`);
      console.log("");
    }
  }

  // Summary
  console.log("─".repeat(50));
  if (errors.length === 0 && warnings.length === 0) {
    console.log("✅ All translation placeholders are valid!");
    process.exit(0);
  } else {
    console.log(
      `\n❌ ${errors.length} error(s), ⚠️  ${warnings.length} warning(s)`
    );
    process.exit(errors.length > 0 ? 1 : 0);
  }
}

validate();
