import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPPORTED_LOCALES = ["ca", "es", "en"];
const DEFAULT_LOCALE = "ca";
const MESSAGES_DIR = path.join(__dirname, "..", "messages");

/**
 * Get all nested keys from an object as dot-notation paths
 */
function getAllKeys(obj, prefix = "") {
  const keys = [];
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
        keys.push(...getAllKeys(obj[key], fullKey));
      } else {
        keys.push(fullKey);
      }
    }
  }
  return keys;
}

/**
 * Set a nested value in an object using dot-notation path
 */
function setNestedValue(obj, path, value) {
  const parts = path.split(".");
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== "object" || current[part] === null || Array.isArray(current[part])) {
      current[part] = {};
    }
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
}

/**
 * Get a nested value from an object using dot-notation path
 */
function getNestedValue(obj, path) {
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

/**
 * Check if a key exists in an object
 */
function hasKey(obj, path) {
  return getNestedValue(obj, path) !== undefined;
}

/**
 * Remove a nested key from an object
 */
function removeNestedKey(obj, path) {
  const parts = path.split(".");
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current === null || current === undefined || typeof current !== "object") {
      return;
    }
    current = current[part];
  }
  if (current && typeof current === "object") {
    delete current[parts[parts.length - 1]];
  }
}

/**
 * Clean up empty objects after removing keys
 */
function cleanupEmptyObjects(obj) {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
        cleanupEmptyObjects(obj[key]);
        if (Object.keys(obj[key]).length === 0) {
          delete obj[key];
        }
      }
    }
  }
}

/**
 * Main sync function
 */
function syncLocales(options = {}) {
  const { removeOrphaned = false, placeholder = "TODO: Translate", checkOnly = false } = options;

  console.log("🌍 Syncing locale files...\n");

  // Read all locale files
  const locales = {};
  for (const locale of SUPPORTED_LOCALES) {
    const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
    try {
      const content = fs.readFileSync(filePath, "utf8");
      locales[locale] = JSON.parse(content);
      console.log(`✓ Loaded ${locale}.json`);
    } catch (error) {
      console.error(`✗ Error loading ${locale}.json:`, error.message);
      process.exit(1);
    }
  }

  // Collect all keys from all locales
  const allKeys = new Set();
  for (const locale of SUPPORTED_LOCALES) {
    const keys = getAllKeys(locales[locale]);
    keys.forEach((key) => allKeys.add(key));
  }

  console.log(`\n📋 Found ${allKeys.size} unique keys across all locales\n`);

  // Sync keys across all locales
  let addedCount = 0;
  let removedCount = 0;

  for (const locale of SUPPORTED_LOCALES) {
    const localeKeys = new Set(getAllKeys(locales[locale]));
    const missingKeys = Array.from(allKeys).filter((key) => !localeKeys.has(key));
    const orphanedKeys = removeOrphaned
      ? Array.from(localeKeys).filter((key) => !allKeys.has(key))
      : [];

    // Add missing keys
    for (const key of missingKeys) {
      // Try to get value from default locale first, then from any other locale
      let value = placeholder;
      if (hasKey(locales[DEFAULT_LOCALE], key)) {
        value = getNestedValue(locales[DEFAULT_LOCALE], key);
      } else {
        for (const otherLocale of SUPPORTED_LOCALES) {
          if (otherLocale !== locale && hasKey(locales[otherLocale], key)) {
            value = getNestedValue(locales[otherLocale], key);
            break;
          }
        }
      }
      // If we got a value from another locale, prefix it to indicate it needs translation
      if (value !== placeholder && value !== getNestedValue(locales[DEFAULT_LOCALE], key)) {
        value = `${placeholder}: ${value}`;
      }
      setNestedValue(locales[locale], key, value);
      addedCount++;
    }

    // Remove orphaned keys if requested
    if (removeOrphaned && orphanedKeys.length > 0) {
      for (const key of orphanedKeys) {
        removeNestedKey(locales[locale], key);
        removedCount++;
      }
      cleanupEmptyObjects(locales[locale]);
    }

    // Report changes
    if (missingKeys.length > 0 || orphanedKeys.length > 0) {
      console.log(`📝 ${locale}.json:`);
      if (missingKeys.length > 0) {
        console.log(`   + Added ${missingKeys.length} missing key(s)`);
        if (missingKeys.length <= 10) {
          missingKeys.forEach((key) => console.log(`      - ${key}`));
        } else {
          missingKeys.slice(0, 10).forEach((key) => console.log(`      - ${key}`));
          console.log(`      ... and ${missingKeys.length - 10} more`);
        }
      }
      if (orphanedKeys.length > 0) {
        console.log(`   - Removed ${orphanedKeys.length} orphaned key(s)`);
        if (orphanedKeys.length <= 10) {
          orphanedKeys.forEach((key) => console.log(`      - ${key}`));
        } else {
          orphanedKeys.slice(0, 10).forEach((key) => console.log(`      - ${key}`));
          console.log(`      ... and ${orphanedKeys.length - 10} more`);
        }
      }
    } else {
      console.log(`✓ ${locale}.json is in sync`);
    }
  }

  // Write updated files (unless check-only mode)
  if (checkOnly) {
    console.log("\n🔍 Check-only mode: No files were modified\n");
    if (addedCount > 0 || removedCount > 0) {
      console.log(`❌ Locales are out of sync!`);
      console.log(`   Missing keys: ${addedCount}`);
      if (removeOrphaned) {
        console.log(`   Orphaned keys: ${removedCount}`);
      }
      console.log(`\n   Run 'yarn i18n:sync' to fix these issues.`);
      process.exit(1);
    } else {
      console.log(`✅ All locales are in sync! 🎉`);
      process.exit(0);
    }
  } else {
    console.log("\n💾 Writing updated files...\n");
    for (const locale of SUPPORTED_LOCALES) {
      const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
      const content = JSON.stringify(locales[locale], null, 2);
      fs.writeFileSync(filePath, content + "\n", "utf8");
      console.log(`✓ Updated ${locale}.json`);
    }

    console.log(`\n✨ Sync complete!`);
    if (addedCount > 0) {
      console.log(`   Added ${addedCount} key(s) across all locales`);
    }
    if (removedCount > 0) {
      console.log(`   Removed ${removedCount} orphaned key(s)`);
    }
    if (addedCount === 0 && removedCount === 0) {
      console.log(`   All locales are in sync! 🎉`);
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const removeOrphaned = args.includes("--remove-orphaned") || args.includes("-r");
const checkOnly = args.includes("--check-only") || args.includes("-c");
const placeholder = args.find((arg) => arg.startsWith("--placeholder="))?.split("=")[1] || "TODO: Translate";

// Run sync
try {
  syncLocales({ removeOrphaned, placeholder, checkOnly });
} catch (error) {
  console.error("\n❌ Error syncing locales:", error);
  process.exit(1);
}
