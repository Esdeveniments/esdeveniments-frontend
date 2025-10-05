#!/usr/bin/env node

/**
 * Component Analysis Suite Runner
 *
 * Runs all analysis scripts and generates a comprehensive report
 *
 * Usage: node scripts/component-analysis/run-all.mjs
 */

import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scripts = [
  "analyze-components.mjs",
  "analyze-tailwind-patterns.mjs",
  "find-duplicates.mjs",
];

console.log("🚀 Component Library Analysis Suite\n");
console.log("=".repeat(50));

for (const script of scripts) {
  console.log(`\nRunning: ${script}`);
  console.log("=".repeat(50));

  try {
    execSync(`node ${path.join(__dirname, script)}`, {
      stdio: "inherit",
      cwd: path.resolve(__dirname, "../.."),
    });
  } catch (error) {
    console.error(`\n❌ Error running ${script}:`, error.message);
    process.exit(1);
  }
}

console.log("\n" + "=".repeat(50));
console.log("✅ All analyses complete!");
console.log("=".repeat(50));
console.log("\n📁 All reports saved to: scripts/component-analysis/output/");
console.log("\nNext steps:");
console.log("1. Review component-inventory.csv for component prioritization");
console.log("2. Check duplicate-analysis.json for consolidation opportunities");
console.log("3. Review tailwind-patterns.json for styling standardization");
console.log("4. Use these insights to plan your extraction sprints\n");
