const fs = require("fs");
const glob = require("glob");
const path = require("path");

/**
 * Text Classes to Design Tokens Audit Script
 *
 * Analyzes hardcoded text sizing classes usage across the codebase to identify:
 * - Direct text-* class usage (text-xs, text-sm, text-base, etc.)
 * - Text component adoption for sizing
 * - Migration readiness percentage
 * - Files requiring migration
 */

function getLineNumber(content, index) {
  const lines = content.substring(0, index).split("\n");
  return lines.length;
}

function getContext(content, index, radius = 2) {
  const lines = content.split("\n");
  const lineNum = getLineNumber(content, index);
  const start = Math.max(0, lineNum - radius - 1);
  const end = Math.min(lines.length, lineNum + radius);
  return lines.slice(start, end).join("\n");
}

function analyzeTextClasses() {
  console.log("🔤 Starting text classes to design tokens analysis...\n");

  const textClassesStats = {
    hardcodedTextSizes: {},
    textComponentUsage: 0,
    filesWithTextClasses: 0,
    totalTextElements: 0,
    hardcodedElements: [], // Array to store detailed info
  };

  // Find all TypeScript/React files
  const files = glob.sync("**/*.{tsx,jsx,ts,js}", {
    ignore: ["node_modules/**", ".next/**", "out/**"],
  });

  files.forEach((file) => {
    const content = fs.readFileSync(file, "utf8");
    let hasTextClasses = false;

    // Count hardcoded text sizes
    const textSizeMatches = content.match(
      /\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl)\b/g,
    );
    if (textSizeMatches) {
      textSizeMatches.forEach((match) => {
        const index = content.indexOf(match);
        const line = getLineNumber(content, index);
        const context = getContext(content, index);
        textClassesStats.hardcodedTextSizes[match] =
          (textClassesStats.hardcodedTextSizes[match] || 0) + 1;
        textClassesStats.hardcodedElements.push({
          type: match,
          file: file,
          line: line,
          context: context,
          element: match,
        });
        hasTextClasses = true;
      });
    }

    // Count Text component usage
    const textComponentMatches = content.match(/<Text\b[^>]*>/g);
    if (textComponentMatches) {
      textClassesStats.textComponentUsage += textComponentMatches.length;
      hasTextClasses = true;
    }

    if (hasTextClasses) {
      textClassesStats.filesWithTextClasses++;
    }
  });

  // Calculate totals
  textClassesStats.totalTextElements =
    Object.values(textClassesStats.hardcodedTextSizes).reduce(
      (sum, count) => sum + count,
      0,
    ) + textClassesStats.textComponentUsage;

  // Display results
  console.log("📊 Text Classes to Design Tokens Analysis Results");
  console.log("===============================================\n");

  console.log("🎯 Hardcoded Text Classes Usage:");
  const sortedTextSizes = Object.entries(
    textClassesStats.hardcodedTextSizes,
  ).sort(([, a], [, b]) => b - a);
  sortedTextSizes.forEach(([className, count]) => {
    console.log(`   ${className.padEnd(12)} → ${count} instances`);
  });

  console.log(`\n🧩 Text Component Usage:`);
  console.log(
    `   <Text> components → ${textClassesStats.textComponentUsage} instances`,
  );

  console.log(`\n📁 Files Analysis:`);
  console.log(
    `   Files with text classes → ${textClassesStats.filesWithTextClasses}`,
  );
  console.log(`   Total files scanned → ${files.length}`);
  console.log(
    `   Text classes coverage → ${((textClassesStats.filesWithTextClasses / files.length) * 100).toFixed(1)}%`,
  );

  console.log(`\n📈 Migration Readiness:`);
  const hardcodedTotal = Object.values(
    textClassesStats.hardcodedTextSizes,
  ).reduce((sum, count) => sum + count, 0);
  const migrationProgress =
    textClassesStats.textComponentUsage > 0
      ? (textClassesStats.textComponentUsage /
          (textClassesStats.textComponentUsage + hardcodedTotal)) *
        100
      : 0;

  console.log(`   Text component adoption → ${migrationProgress.toFixed(1)}%`);
  console.log(`   Remaining hardcoded classes → ${hardcodedTotal} instances`);
  console.log(
    `   Unique text classes to migrate → ${Object.keys(textClassesStats.hardcodedTextSizes).length}`,
  );

  // Detailed breakdown of remaining elements
  console.log(
    `\n📋 Detailed Breakdown of ${textClassesStats.hardcodedElements.length} Hardcoded Text Classes:`,
  );
  console.log("=".repeat(80));

  // Group by file for better organization
  const groupedByFile = textClassesStats.hardcodedElements.reduce(
    (acc, elem) => {
      if (!acc[elem.file]) acc[elem.file] = [];
      acc[elem.file].push(elem);
      return acc;
    },
    {},
  );

  // Sort files by priority (components first, then pages)
  const sortedFiles = Object.keys(groupedByFile).sort((a, b) => {
    const isComponentA = a.includes("components/");
    const isComponentB = b.includes("components/");
    if (isComponentA && !isComponentB) return -1;
    if (!isComponentA && isComponentB) return 1;
    return a.localeCompare(b);
  });

  sortedFiles.forEach((file) => {
    console.log(`\n📄 ${file}:`);
    groupedByFile[file].forEach((elem, index) => {
      console.log(`   ${index + 1}. ${elem.type} at line ${elem.line}`);
      console.log(`      Element: ${elem.element}`);
      console.log(`      Context:`);
      elem.context.split("\n").forEach((line, i) => {
        console.log(`        ${line}`);
      });
      console.log("");
    });
  });

  // Recommendations
  console.log(`\n💡 Recommendations:`);
  if (hardcodedTotal > 0) {
    console.log(
      `   🔴 Replace ${hardcodedTotal} hardcoded text sizing classes with <Text variant="...">`,
    );
  }
  if (Object.keys(textClassesStats.hardcodedTextSizes).length > 5) {
    console.log(
      `   🟡 Focus on high-frequency classes: ${sortedTextSizes
        .slice(0, 3)
        .map(([cls]) => cls)
        .join(", ")}`,
    );
  }
  if (textClassesStats.textComponentUsage === 0) {
    console.log(
      `   🔴 Start migration by adopting Text component in high-priority components`,
    );
  }

  // Migration mapping suggestions
  console.log(`\n🔄 Suggested Migration Mapping:`);
  const migrationMap = {
    "text-xs": 'variant="caption"',
    "text-sm": 'variant="body-sm"',
    "text-base": 'variant="body"',
    "text-lg": 'variant="body-lg"',
    "text-xl": 'variant="h3"',
    "text-2xl": 'variant="h2"',
    "text-3xl": 'variant="h1"',
    "text-4xl": 'variant="h1"',
    "text-5xl": 'variant="h1"',
    "text-6xl": 'variant="h1"',
  };

  Object.keys(textClassesStats.hardcodedTextSizes).forEach((cls) => {
    if (migrationMap[cls]) {
      console.log(`   ${cls.padEnd(12)} → <Text ${migrationMap[cls]}>`);
    }
  });

  console.log(`\n✅ Analysis complete!`);

  return textClassesStats;
}

// Export for use in other scripts
module.exports = { analyzeTextClasses };

// Run if called directly
if (require.main === module) {
  analyzeTextClasses();
}
