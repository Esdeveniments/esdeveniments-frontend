#!/usr/bin/env node

/**
 * Tailwind Pattern Analysis Script
 *
 * Analyzes Tailwind CSS usage patterns across components:
 * - Color token usage (vs hardcoded colors)
 * - Spacing patterns
 * - Typography patterns
 * - Inconsistencies and opportunities for standardization
 *
 * Usage: node scripts/component-analysis/analyze-tailwind-patterns.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");
const COMPONENTS_DIR = path.join(ROOT_DIR, "components/ui");
const OUTPUT_DIR = path.join(ROOT_DIR, "scripts/component-analysis/output");

// Design tokens from tailwind.config.js
const DESIGN_TOKENS = {
  colors: [
    "primary",
    "primarydark",
    "primarySoft",
    "whiteCorp",
    "darkCorp",
    "blackCorp",
    "bColor",
  ],
  spacing: [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "8",
    "10",
    "12",
    "16",
    "20",
    "24",
  ],
  fonts: ["font-roboto", "font-barlow"],
};

/**
 * Get all component files recursively
 */
function getComponentFiles(dir) {
  const files = [];

  function traverse(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        traverse(fullPath);
      } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".jsx")) {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}

/**
 * Extract Tailwind classes from a file
 */
function extractTailwindClasses(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");

  // Match className, class, and tw`` patterns
  const classNameRegex = /className=["'`]([^"'`]+)["'`]/g;
  const classes = [];

  let match;
  while ((match = classNameRegex.exec(content)) !== null) {
    const classString = match[1];
    // Split by spaces, handling template literals
    const individualClasses = classString
      .split(/\s+/)
      .filter((c) => c.length > 0);
    classes.push(...individualClasses);
  }

  return classes;
}

/**
 * Categorize Tailwind classes
 */
function categorizeTailwindClasses(classes) {
  const categories = {
    colors: {
      text: [],
      bg: [],
      border: [],
      tokens: [],
      hardcoded: [],
    },
    spacing: {
      padding: [],
      margin: [],
      gap: [],
    },
    typography: {
      fontFamily: [],
      fontSize: [],
      fontWeight: [],
    },
    layout: [],
    other: [],
  };

  for (const cls of classes) {
    // Skip dynamic classes and template literals
    if (cls.includes("${") || cls.includes("{") || cls.includes("?")) {
      continue;
    }

    // Color classes
    if (cls.startsWith("text-")) {
      const colorPart = cls.replace("text-", "");
      const baseColor = colorPart.split("/")[0].split("-")[0];

      if (DESIGN_TOKENS.colors.includes(baseColor)) {
        categories.colors.tokens.push(cls);
      } else if (
        colorPart.match(/^(red|blue|green|yellow|gray|purple|pink|indigo)-\d+/)
      ) {
        categories.colors.hardcoded.push(cls);
      }
      categories.colors.text.push(cls);
    } else if (cls.startsWith("bg-")) {
      const colorPart = cls.replace("bg-", "");
      const baseColor = colorPart.split("/")[0].split("-")[0];

      if (DESIGN_TOKENS.colors.includes(baseColor)) {
        categories.colors.tokens.push(cls);
      } else if (
        colorPart.match(/^(red|blue|green|yellow|gray|purple|pink|indigo)-\d+/)
      ) {
        categories.colors.hardcoded.push(cls);
      }
      categories.colors.bg.push(cls);
    } else if (cls.startsWith("border-")) {
      const colorPart = cls.replace("border-", "");
      const baseColor = colorPart.split("/")[0].split("-")[0];

      if (DESIGN_TOKENS.colors.includes(baseColor)) {
        categories.colors.tokens.push(cls);
      } else if (
        colorPart.match(/^(red|blue|green|yellow|gray|purple|pink|indigo)-\d+/)
      ) {
        categories.colors.hardcoded.push(cls);
      }
      categories.colors.border.push(cls);
    }

    // Spacing classes
    else if (cls.match(/^p[trblxy]?-/)) {
      categories.spacing.padding.push(cls);
    } else if (cls.match(/^m[trblxy]?-/)) {
      categories.spacing.margin.push(cls);
    } else if (cls.startsWith("gap-")) {
      categories.spacing.gap.push(cls);
    }

    // Typography classes
    else if (
      cls.startsWith("font-") &&
      DESIGN_TOKENS.fonts.some((f) => cls === f)
    ) {
      categories.typography.fontFamily.push(cls);
    } else if (cls.match(/^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)/)) {
      categories.typography.fontSize.push(cls);
    } else if (
      cls.match(/^font-(thin|light|normal|medium|semibold|bold|extrabold)/)
    ) {
      categories.typography.fontWeight.push(cls);
    }

    // Layout classes
    else if (cls.match(/^(flex|grid|w-|h-|max-|min-)/)) {
      categories.layout.push(cls);
    }

    // Other
    else {
      categories.other.push(cls);
    }
  }

  return categories;
}

/**
 * Count class occurrences
 */
function countOccurrences(arr) {
  const counts = {};
  for (const item of arr) {
    counts[item] = (counts[item] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {});
}

/**
 * Main analysis function
 */
function runAnalysis() {
  console.log("🎨 Starting Tailwind pattern analysis...\n");

  const files = getComponentFiles(COMPONENTS_DIR);
  console.log(`Analyzing ${files.length} component files\n`);

  const allClasses = [];

  for (const file of files) {
    const classes = extractTailwindClasses(file);
    allClasses.push(...classes);
  }

  console.log(`Found ${allClasses.length} total class usages\n`);

  const categorized = categorizeTailwindClasses(allClasses);

  // Generate statistics
  const stats = {
    colors: {
      totalColorClasses:
        categorized.colors.text.length +
        categorized.colors.bg.length +
        categorized.colors.border.length,
      usingTokens: categorized.colors.tokens.length,
      hardcoded: categorized.colors.hardcoded.length,
      tokenPercentage:
        Math.round(
          (categorized.colors.tokens.length /
            (categorized.colors.tokens.length +
              categorized.colors.hardcoded.length)) *
            100,
        ) || 0,
      topTextColors: countOccurrences(categorized.colors.text),
      topBgColors: countOccurrences(categorized.colors.bg),
      topBorderColors: countOccurrences(categorized.colors.border),
      hardcodedColors: categorized.colors.hardcoded,
    },
    spacing: {
      totalSpacing:
        categorized.spacing.padding.length +
        categorized.spacing.margin.length +
        categorized.spacing.gap.length,
      topPadding: countOccurrences(categorized.spacing.padding),
      topMargin: countOccurrences(categorized.spacing.margin),
      topGap: countOccurrences(categorized.spacing.gap),
    },
    typography: {
      fontFamilies: countOccurrences(categorized.typography.fontFamily),
      fontSizes: countOccurrences(categorized.typography.fontSize),
      fontWeights: countOccurrences(categorized.typography.fontWeight),
    },
    layout: {
      topLayouts: Object.fromEntries(
        Object.entries(countOccurrences(categorized.layout)).slice(0, 20),
      ),
    },
  };

  // Save detailed report
  const reportPath = path.join(OUTPUT_DIR, "tailwind-patterns.json");
  fs.writeFileSync(reportPath, JSON.stringify(stats, null, 2));

  // Generate recommendations
  const recommendations = [];

  if (stats.colors.hardcodedColors.length > 0) {
    recommendations.push({
      category: "Colors",
      issue: `Found ${stats.colors.hardcodedColors.length} hardcoded color usages`,
      action:
        "Replace with design tokens (primary, whiteCorp, blackCorp, etc.)",
      examples: [...new Set(stats.colors.hardcodedColors)].slice(0, 5),
    });
  }

  // Check for inconsistent spacing patterns
  const paddingValues = Object.keys(stats.spacing.topPadding);
  if (paddingValues.length > 10) {
    recommendations.push({
      category: "Spacing",
      issue: `Using ${paddingValues.length} different padding values`,
      action: "Standardize to common spacing scale (e.g., 2, 4, 6, 8)",
      examples: paddingValues.slice(0, 10),
    });
  }

  const recommendationsPath = path.join(
    OUTPUT_DIR,
    "tailwind-recommendations.json",
  );
  fs.writeFileSync(
    recommendationsPath,
    JSON.stringify(recommendations, null, 2),
  );

  // Print summary
  console.log("✅ Analysis complete!\n");
  console.log("📊 Summary:");
  console.log(`   Total class usages: ${allClasses.length}`);
  console.log(`   Color classes: ${stats.colors.totalColorClasses}`);
  console.log(`   Using design tokens: ${stats.colors.tokenPercentage}%`);
  console.log(`   Hardcoded colors: ${stats.colors.hardcodedColors.length}`);
  console.log(`   Spacing classes: ${stats.spacing.totalSpacing}`);

  console.log("\n🎨 Top 5 Text Colors:");
  Object.entries(stats.colors.topTextColors)
    .slice(0, 5)
    .forEach(([cls, count]) => {
      console.log(`   ${cls}: ${count} usages`);
    });

  console.log("\n📏 Top 5 Padding Classes:");
  Object.entries(stats.spacing.topPadding)
    .slice(0, 5)
    .forEach(([cls, count]) => {
      console.log(`   ${cls}: ${count} usages`);
    });

  console.log("\n📝 Top 5 Font Sizes:");
  Object.entries(stats.typography.fontSizes)
    .slice(0, 5)
    .forEach(([cls, count]) => {
      console.log(`   ${cls}: ${count} usages`);
    });

  if (recommendations.length > 0) {
    console.log("\n⚠️  Recommendations:");
    recommendations.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec.category}: ${rec.issue}`);
      console.log(`      Action: ${rec.action}`);
    });
  }

  console.log(`\n📁 Reports saved to: ${OUTPUT_DIR}`);
  console.log(`   - tailwind-patterns.json`);
  console.log(`   - tailwind-recommendations.json`);
}

// Run the analysis
runAnalysis();
